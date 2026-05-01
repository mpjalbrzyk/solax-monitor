// Function: monthly-digest
// Purpose: Send monthly summary email per active recipient. Pulls daily_aggregates
//          for the month that just closed, narrates it, sends HTML via Resend.
//          Includes YoY comparison if same month previous year has data.
// Schedule: 1st of month at 08:00 Europe/Warsaw — handled via pg_cron migration.
// Manual trigger: POST {} to the function endpoint.

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  fetchActiveRecipients,
  fetchDailyAggregates,
  summarizeDailies,
  todayWarsaw,
  shiftDate,
  firstOfMonth,
  lastOfMonth,
  formatMonthName,
} from "../_shared/digest-data.ts";
import { narrateMonth, formatKwh, formatPln } from "../_shared/period-narrator.ts";
import { buildDigestHtml, type DigestSection } from "../_shared/email-template.ts";
import { sendEmail } from "../_shared/resend-client.ts";

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Missing Supabase env" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const fromEmail =
    Deno.env.get("RESEND_FROM_EMAIL") ?? "Solax Monitor <onboarding@resend.dev>";
  const appUrl = Deno.env.get("PUBLIC_APP_URL") ?? "https://solax-monitor.vercel.app";

  // Job leci 1go o 8:00, więc bilansujemy miesiąc który właśnie się skończył.
  // Today = 1 maja → poprzedni miesiąc = kwiecień (1.04 - 30.04).
  const today = todayWarsaw();
  const firstOfThisMonth = firstOfMonth(today); // 2026-05-01
  const lastDayOfPrevMonth = shiftDate(firstOfThisMonth, -1); // 2026-04-30
  const firstDayOfPrevMonth = firstOfMonth(lastDayOfPrevMonth); // 2026-04-01

  // YoY — same month previous year
  const yoyFirst = `${Number(firstDayOfPrevMonth.slice(0, 4)) - 1}-${firstDayOfPrevMonth.slice(5)}`;
  const yoyLast = lastOfMonth(yoyFirst);

  let recipients;
  try {
    recipients = await fetchActiveRecipients(supabase);
  } catch (err) {
    return jsonResponse(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }

  if (recipients.length === 0) {
    return jsonResponse({ ok: true, sent: 0, message: "no active recipients" });
  }

  const results: { email: string; ok: boolean; id?: string; error?: string }[] = [];

  for (const r of recipients) {
    try {
      const [monthRows, yoyRows] = await Promise.all([
        fetchDailyAggregates(
          supabase,
          r.inverter_id,
          firstDayOfPrevMonth,
          lastDayOfPrevMonth,
        ),
        fetchDailyAggregates(supabase, r.inverter_id, yoyFirst, yoyLast),
      ]);

      const summary = summarizeDailies(monthRows);
      const yoy = summarizeDailies(yoyRows);

      const narration = narrateMonth({
        monthDate: firstDayOfPrevMonth,
        todayWarsaw: today,
        yieldKwh: summary.yieldKwh,
        savingsPln: summary.revenuePln,
        costPln: summary.costPln,
        balancePln: summary.balancePln,
        daysWithData: summary.daysWithData,
        bestDayKwh: summary.bestDayKwh > 0 ? summary.bestDayKwh : null,
        bestDayDate: summary.bestDayDate,
        selfUsePct: summary.selfUseAvg,
        sameMonthLastYearKwh: yoy.yieldKwh > 0 ? yoy.yieldKwh : null,
      });

      const monthLabel = formatMonthName(firstDayOfPrevMonth);
      const section: DigestSection = {
        heading: `Miesiąc ${monthLabel}`,
        narration,
        metrics: [
          { label: "Produkcja", value: formatKwh(summary.yieldKwh, 0) },
          { label: "Bilans miesiąca", value: formatPln(summary.balancePln, true) },
          { label: "Oszczędność + przychód", value: formatPln(summary.revenuePln) },
          { label: "Koszt poboru", value: formatPln(summary.costPln) },
          {
            label: "Najlepszy dzień",
            value:
              summary.bestDayKwh > 0
                ? `${formatKwh(summary.bestDayKwh, 1)} (${Number(summary.bestDayDate?.slice(8) ?? 0)})`
                : "—",
          },
          {
            label: "Autokonsumpcja śr.",
            value:
              summary.selfUseAvg != null
                ? `${Math.round(summary.selfUseAvg)}%`
                : "—",
          },
        ],
        detailUrl: `${appUrl}/monthly?month=${firstDayOfPrevMonth.slice(0, 7)}`,
      };

      const html = buildDigestHtml({
        title: `Raport miesięczny · ${monthLabel}`,
        subtitle: `${summary.daysWithData} dni z danymi · 7,7 kWp Ząbki`,
        preheader: `${narration.headline} · ${formatKwh(summary.yieldKwh, 0)} produkcji, bilans ${formatPln(summary.balancePln, true)}`,
        sections: [section],
        appUrl,
        footerNote:
          "Raport wygenerowany automatycznie 1. dnia miesiąca o 8:00. Następny raport: 1. dnia kolejnego miesiąca.",
      });

      const sendResult = await sendEmail({
        from: fromEmail,
        to: [r.email],
        subject: `Solax · Raport miesięczny ${monthLabel}`,
        html,
      });

      results.push({
        email: r.email,
        ok: sendResult.ok,
        id: sendResult.id,
        error: sendResult.error,
      });
    } catch (err) {
      results.push({
        email: r.email,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  return jsonResponse({
    ok: true,
    period: { from: firstDayOfPrevMonth, to: lastDayOfPrevMonth },
    recipients: results.length,
    sent,
    results,
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
