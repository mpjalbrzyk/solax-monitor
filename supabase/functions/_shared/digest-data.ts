// Helpers do pobierania danych dla digestów. Trzymane razem żeby weekly i
// monthly miały spójny kontrakt z Supabase i nie kopiowały zapytań.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type DailyAggregateRow = {
  date: string;
  yield_kwh: number | null;
  consumption_kwh: number | null;
  import_kwh: number | null;
  export_kwh: number | null;
  self_use_rate_pct: number | null;
  savings_pln: number | null;
  cost_pln: number | null;
  earnings_pln: number | null;
  net_balance_pln: number | null;
};

export type DigestRecipient = {
  inverter_id: string;
  user_id: string;
  email: string;
  pv_capacity_kwp: number | null;
  installation_date: string | null;
};

export async function fetchActiveRecipients(
  supabase: SupabaseClient,
): Promise<DigestRecipient[]> {
  // Aktywne instalacje + email z Supabase Auth (auth.users) via admin API.
  // Multi-tenant ready — jak dojdzie tata/brat, automatycznie ich łapiemy.
  // Override możliwy przez env DIGEST_RECIPIENT_EMAIL (test/MVP).
  const overrideEmail = Deno.env.get("DIGEST_RECIPIENT_EMAIL");

  const { data: inverters, error: invErr } = await supabase
    .from("user_inverters")
    .select("id, user_id, pv_capacity_kwp, installation_date")
    .eq("is_active", true);

  if (invErr) throw new Error(`fetch inverters: ${invErr.message}`);
  if (!inverters || inverters.length === 0) return [];

  // Listuję wszystkich userów raz, mapuję po user_id.
  // listUsers zwraca page po max 50 — wystarczy dla rodziny.
  const { data: usersResp, error: authErr } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (authErr) throw new Error(`auth.admin.listUsers: ${authErr.message}`);

  const emailById = new Map<string, string>();
  for (const u of usersResp.users) {
    if (u.email) emailById.set(u.id, u.email);
  }

  const recipients: DigestRecipient[] = [];
  for (const inv of inverters) {
    const email = overrideEmail ?? emailById.get(inv.user_id);
    if (!email) continue;
    recipients.push({
      inverter_id: inv.id,
      user_id: inv.user_id,
      email,
      pv_capacity_kwp: inv.pv_capacity_kwp,
      installation_date: inv.installation_date,
    });
  }
  return recipients;
}

export async function fetchDailyAggregates(
  supabase: SupabaseClient,
  inverterId: string,
  fromDate: string,
  toDate: string,
): Promise<DailyAggregateRow[]> {
  const { data, error } = await supabase
    .from("daily_aggregates")
    .select(
      "date, yield_kwh, consumption_kwh, import_kwh, export_kwh, self_use_rate_pct, savings_pln, cost_pln, earnings_pln, net_balance_pln",
    )
    .eq("inverter_id", inverterId)
    .gte("date", fromDate)
    .lte("date", toDate)
    .order("date", { ascending: true });

  if (error) throw new Error(`fetch daily_aggregates: ${error.message}`);
  return (data ?? []) as DailyAggregateRow[];
}

export type AggSummary = {
  yieldKwh: number;
  costPln: number;
  revenuePln: number; // savings + earnings
  balancePln: number;
  daysWithData: number;
  bestDayKwh: number;
  bestDayDate: string | null;
  selfUseAvg: number | null;
};

export function summarizeDailies(rows: DailyAggregateRow[]): AggSummary {
  let yieldKwh = 0;
  let costPln = 0;
  let revenuePln = 0;
  let balancePln = 0;
  let bestDayKwh = 0;
  let bestDayDate: string | null = null;
  let selfUseSum = 0;
  let selfUseN = 0;
  let daysWithData = 0;

  for (const r of rows) {
    const k = Number(r.yield_kwh ?? 0);
    const c = Number(r.cost_pln ?? 0);
    const s = Number(r.savings_pln ?? 0) + Number(r.earnings_pln ?? 0);
    yieldKwh += k;
    costPln += c;
    revenuePln += s;
    balancePln += s - c;
    if (k > 0) daysWithData++;
    if (k > bestDayKwh) {
      bestDayKwh = k;
      bestDayDate = r.date;
    }
    if (r.self_use_rate_pct != null) {
      selfUseSum += Number(r.self_use_rate_pct);
      selfUseN++;
    }
  }

  return {
    yieldKwh,
    costPln,
    revenuePln,
    balancePln,
    daysWithData,
    bestDayKwh,
    bestDayDate,
    selfUseAvg: selfUseN > 0 ? selfUseSum / selfUseN : null,
  };
}

// Date helpers — Edge Functions don't have lib/date

export function todayWarsaw(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function shiftDate(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatYmd(dt);
}

export function mondayOf(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return formatYmd(dt);
}

export function firstOfMonth(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 7)}-01`;
}

export function lastOfMonth(yyyymmdd: string): string {
  const [y, m] = yyyymmdd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m, 0));
  return formatYmd(dt);
}

function formatYmd(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const PL_MONTHS = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];

export function formatWeekRange(monday: string): string {
  const sunday = shiftDate(monday, 6);
  const dMon = Number(monday.slice(8, 10));
  const dSun = Number(sunday.slice(8, 10));
  const mMon = Number(monday.slice(5, 7));
  const mSun = Number(sunday.slice(5, 7));
  if (mMon === mSun) return `${dMon}–${dSun} ${PL_MONTHS[mMon - 1]}`;
  return `${dMon} ${PL_MONTHS[mMon - 1]} – ${dSun} ${PL_MONTHS[mSun - 1]}`;
}

export function formatMonthName(yyyymmdd: string): string {
  const m = Number(yyyymmdd.slice(5, 7));
  const y = yyyymmdd.slice(0, 4);
  const months = [
    "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
    "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień",
  ];
  return `${months[m - 1]} ${y}`;
}
