// Function: weekly-digest
// Purpose: Send weekly summary email per active recipient. Pulls last 7 days
//          of daily_aggregates, narrates the week, sends HTML via Resend.
// Schedule: every Monday at 07:00 Europe/Warsaw (cron 0 5 * * 1 in UTC for CET,
//          0 6 * * 1 for CEST — handled via pg_cron migration).
// Manual trigger: POST {} to the function endpoint with service-role bearer.
//
// Env required:
//   RESEND_API_KEY                  — from resend.com (free tier 3k mails/mc)
//   RESEND_FROM_EMAIL               — verified sender, default "Solax Monitor <onboarding@resend.dev>"
//   PUBLIC_APP_URL                  — e.g. https://solax-monitor.vercel.app (CTA link)
//   DIGEST_RECIPIENT_EMAIL          — optional override (skip auth.users lookup)

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  fetchActiveRecipients,
  fetchDailyAggregates,
  summarizeDailies,
  todayWarsaw,
  shiftDate,
  mondayOf,
  formatWeekRange,
} from "../_shared/digest-data.ts";
import { narrateWeek, formatKwh, formatPln } from "../_shared/period-narrator.ts";
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

  // Bieżący tydzień to ten zakończony — czyli poniedziałek - niedziela
  // sprzed obecnego poniedziałku. Job leci w pn 07:00, więc patrzy na
  // tydzień który właśnie się skończył wczoraj wieczorem.
  const today = todayWarsaw();
  const thisWeekMonday = mondayOf(today);
  const lastWeekMonday = shiftDate(thisWeekMonday, -7);
  const lastWeekSunday = shiftDate(thisWeekMonday, -1);
  const prevWeekMonday = shiftDate(lastWeekMonday, -7);
  const prevWeekSunday = shiftDate(lastWeekMonday, -1);

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
      const [thisWeekRows, prevWeekRows] = await Promise.all([
        fetchDailyAggregates(supabase, r.inverter_id, lastWeekMonday, lastWeekSunday),
        fetchDailyAggregates(supabase, r.inverter_id, prevWeekMonday, prevWeekSunday),
      ]);

      const summary = summarizeDailies(thisWeekRows);
      const prevYield = summarizeDailies(prevWeekRows).yieldKwh;

      const narration = narrateWeek({
        weekStart: lastWeekMonday,
        weekEnd: lastWeekSunday,
        yieldKwh: summary.yieldKwh,
        savingsPln: summary.revenuePln,
        costPln: summary.costPln,
        balancePln: summary.balancePln,
        daysWithData: summary.daysWithData,
        bestDayKwh: summary.bestDayKwh > 0 ? summary.bestDayKwh : null,
        bestDayDate: summary.bestDayDate,
        prevWeekYieldKwh: prevYield > 0 ? prevYield : null,
      });

      const weekLabel = formatWeekRange(lastWeekMonday);
      const section: DigestSection = {
        heading: `Tydzień ${weekLabel}`,
        narration,
        metrics: [
          { label: "Produkcja", value: formatKwh(summary.yieldKwh, 0) },
          { label: "Bilans tygodnia", value: formatPln(summary.balancePln, true) },
          { label: "Oszczędność + przychód", value: formatPln(summary.revenuePln) },
          { label: "Koszt poboru", value: formatPln(summary.costPln) },
          {
            label: "Średnia dzienna",
            value:
              summary.daysWithData > 0
                ? formatKwh(summary.yieldKwh / 7, 1)
                : "—",
          },
        ],
        detailUrl: `${appUrl}/weekly?week=${lastWeekMonday}`,
      };

      const html = buildDigestHtml({
        title: `Raport tygodniowy · ${weekLabel}`,
        subtitle: `${summary.daysWithData}/7 dni z danymi · 7,7 kWp Ząbki`,
        preheader: `${narration.headline} · ${formatKwh(summary.yieldKwh, 0)} produkcji, bilans ${formatPln(summary.balancePln, true)}`,
        sections: [section],
        appUrl,
        footerNote:
          "Raport wygenerowany automatycznie. Pełne szczegóły + dłuższe okresy: kliknij przycisk wyżej.",
      });

      const sendResult = await sendEmail({
        from: fromEmail,
        to: [r.email],
        subject: `Solax · Raport tygodniowy ${weekLabel}`,
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
    period: { from: lastWeekMonday, to: lastWeekSunday },
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
