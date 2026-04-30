// Edge Function: roll-monthly-aggregates
//
// Sums daily_aggregates for the previous calendar month (Europe/Warsaw) and
// UPSERTs the result into monthly_aggregates. Multi-tenant: iterates every
// active inverter.
//
// Schedule: cron 1st of month at 02:00 UTC. With pg_cron + pg_net trigger.
//
// Why this exists: Solax API only exposes the past ~13 months. Without rolling
// our own monthly aggregates from daily data, history would silently fall off
// the back of `monthly_aggregates`. Now we own the data permanently.
//
// Body: { month?: 'YYYY-MM', inverter_id?: UUID } — both optional.
// If `month` omitted, runs for "previous month in Europe/Warsaw" (the
// production cron path). If supplied, runs for that month (manual replay).

import { createClient } from "jsr:@supabase/supabase-js@2";

interface DailyRow {
  inverter_id: string;
  user_id: string;
  date: string;
  yield_kwh: number | null;
  consumption_kwh: number | null;
  import_kwh: number | null;
  export_kwh: number | null;
  battery_charged_kwh: number | null;
  battery_discharged_kwh: number | null;
}

function previousMonthInWarsaw(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = fmt.format(new Date());
  const [y, m] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 2, 1));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

function monthBounds(yearMonth: string): { from: string; to: string } {
  const [y, m] = yearMonth.split("-").map(Number);
  const from = `${yearMonth}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let body: { month?: string; inverter_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    // No body = use defaults (cron path)
  }

  const yearMonth = body.month ?? previousMonthInWarsaw();
  const { from, to } = monthBounds(yearMonth);
  const monthDate = `${yearMonth}-01`;

  // Pick inverters
  let inverterQuery = supabase
    .from("user_inverters")
    .select("id, user_id")
    .eq("is_active", true);
  if (body.inverter_id) {
    inverterQuery = inverterQuery.eq("id", body.inverter_id);
  }
  const { data: inverters, error: invErr } = await inverterQuery;
  if (invErr || !inverters) {
    return new Response(
      JSON.stringify({ ok: false, error: invErr?.message ?? "no inverters" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const results: Array<{
    inverter_id: string;
    month: string;
    days_aggregated: number;
    upserted: boolean;
    error?: string;
  }> = [];

  for (const inv of inverters) {
    const { data: rows, error: dailyErr } = await supabase
      .from("daily_aggregates")
      .select(
        "inverter_id, user_id, date, yield_kwh, consumption_kwh, import_kwh, export_kwh, battery_charged_kwh, battery_discharged_kwh",
      )
      .eq("inverter_id", inv.id)
      .gte("date", from)
      .lte("date", to);

    if (dailyErr) {
      results.push({
        inverter_id: inv.id,
        month: yearMonth,
        days_aggregated: 0,
        upserted: false,
        error: dailyErr.message,
      });
      continue;
    }

    const daily = (rows ?? []) as DailyRow[];
    if (daily.length === 0) {
      results.push({
        inverter_id: inv.id,
        month: yearMonth,
        days_aggregated: 0,
        upserted: false,
        error: "no daily data for this month",
      });
      continue;
    }

    const sum = daily.reduce(
      (acc, r) => ({
        yield_kwh: acc.yield_kwh + Number(r.yield_kwh ?? 0),
        consumption_kwh: acc.consumption_kwh + Number(r.consumption_kwh ?? 0),
        import_kwh: acc.import_kwh + Number(r.import_kwh ?? 0),
        export_kwh: acc.export_kwh + Number(r.export_kwh ?? 0),
        battery_charged_kwh:
          acc.battery_charged_kwh + Number(r.battery_charged_kwh ?? 0),
        battery_discharged_kwh:
          acc.battery_discharged_kwh + Number(r.battery_discharged_kwh ?? 0),
      }),
      {
        yield_kwh: 0,
        consumption_kwh: 0,
        import_kwh: 0,
        export_kwh: 0,
        battery_charged_kwh: 0,
        battery_discharged_kwh: 0,
      },
    );

    const { error: upsertErr } = await supabase
      .from("monthly_aggregates")
      .upsert(
        {
          user_id: inv.user_id,
          inverter_id: inv.id,
          month: monthDate,
          pv_generation_kwh: round2(sum.yield_kwh),
          inverter_ac_output_kwh: round2(sum.yield_kwh), // approximation
          export_energy_kwh: round2(sum.export_kwh),
          import_energy_kwh: round2(sum.import_kwh),
          load_consumption_kwh: round2(sum.consumption_kwh),
          battery_charged_kwh: round2(sum.battery_charged_kwh),
          battery_discharged_kwh: round2(sum.battery_discharged_kwh),
          earnings: 0, // computed from RCEm in financial dashboard, not stored here
          updated_at: new Date().toISOString(),
        },
        { onConflict: "inverter_id,month" },
      );

    if (upsertErr) {
      results.push({
        inverter_id: inv.id,
        month: yearMonth,
        days_aggregated: daily.length,
        upserted: false,
        error: upsertErr.message,
      });
      continue;
    }

    results.push({
      inverter_id: inv.id,
      month: yearMonth,
      days_aggregated: daily.length,
      upserted: true,
    });
  }

  return new Response(
    JSON.stringify({ ok: true, month: yearMonth, results }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
