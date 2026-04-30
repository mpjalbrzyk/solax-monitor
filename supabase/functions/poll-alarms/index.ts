// Function: poll-alarms
// Purpose: For every active user_inverter, hit Solax /openapi/v2/alarm/page_alarm_info
//          for ongoing alarms (alarmState=1), upsert into inverter_alarms by
//          unique (inverter_id, error_code, alarm_start_time). Fires send-alert
//          for new alarms with alarm_level >= 2.
//
// Schedule: every 15 minutes (cron */15 * * * *) — to be enabled in Commit 9.
//
// Multi-tenant + per-inverter error isolation. Alarm dedup via DB unique constraint.

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { type ApiCredentialRow, solaxFetch } from "../_shared/solax-client.ts";

interface UserInverter {
  id: string;
  user_id: string;
  solax_plant_id: string;
}

interface SolaxAlarmsPage {
  total?: number;
  pages?: number;
  current?: number;
  size?: number;
  records?: SolaxAlarm[];
}

interface SolaxAlarm {
  errorCode: string;
  alarmName?: string;
  alarmType?: string;
  alarmLevel?: number;
  alarmState?: number;
  alarmStartTime?: string;
  alarmEndTime?: string;
  deviceSn?: string;
}

interface PollOutcome {
  inverter_id: string;
  user_id: string;
  status: "ok" | "failed";
  alarms_seen: number;
  alarms_upserted: number;
  alerts_triggered: number;
  error?: string;
}

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: inverters, error: invError } = await supabase
    .from("user_inverters")
    .select("id, user_id, solax_plant_id")
    .eq("is_active", true);

  if (invError) return jsonResponse({ ok: false, error: `select inverters: ${invError.message}` }, 500);
  if (!inverters || inverters.length === 0) {
    return jsonResponse({ ok: true, polled: 0, message: "no active inverters" });
  }

  const outcomes: PollOutcome[] = [];

  for (const inv of inverters as UserInverter[]) {
    const outcome: PollOutcome = {
      inverter_id: inv.id,
      user_id: inv.user_id,
      status: "ok",
      alarms_seen: 0,
      alarms_upserted: 0,
      alerts_triggered: 0,
    };

    try {
      const result = await pollAlarmsForInverter(supabase, inv, supabaseUrl, serviceRoleKey);
      Object.assign(outcome, result);
    } catch (err) {
      outcome.status = "failed";
      outcome.error = err instanceof Error ? err.message : String(err);
      console.error(`poll-alarms failed for inverter ${inv.id}:`, outcome.error);
    }

    outcomes.push(outcome);
  }

  const failed = outcomes.filter((o) => o.status === "failed").length;

  return jsonResponse(
    {
      ok: failed === 0,
      inverters_polled: outcomes.length,
      total_alarms_seen: outcomes.reduce((s, o) => s + o.alarms_seen, 0),
      total_alerts_triggered: outcomes.reduce((s, o) => s + o.alerts_triggered, 0),
      outcomes,
    },
    failed === 0 ? 200 : 207,
  );
});

async function pollAlarmsForInverter(
  supabase: SupabaseClient,
  inv: UserInverter,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<{ alarms_seen: number; alarms_upserted: number; alerts_triggered: number }> {
  const { data: cred, error: credError } = await supabase
    .from("api_credentials")
    .select(
      "id, user_id, client_id, client_secret_encrypted, access_token_encrypted, expires_at",
    )
    .eq("user_id", inv.user_id)
    .eq("provider", "solax_developer")
    .single<ApiCredentialRow>();

  if (credError || !cred) throw new Error(`no Solax credentials for user_id ${inv.user_id}`);

  // Solax: alarmState=1 → ongoing. Page through if needed (typically empty for healthy plant).
  const result = await solaxFetch<SolaxAlarmsPage>(
    supabase,
    cred,
    "/openapi/v2/alarm/page_alarm_info",
    {
      plantId: inv.solax_plant_id,
      businessType: "1",
      alarmState: "1",
    },
  );

  const alarms = result?.records ?? [];
  let alarmsUpserted = 0;
  let alertsTriggered = 0;

  for (const alarm of alarms) {
    if (!alarm.errorCode || !alarm.alarmStartTime || !alarm.deviceSn) {
      console.warn("skipping malformed alarm:", alarm);
      continue;
    }

    // Upsert by (inverter_id, error_code, alarm_start_time) unique constraint.
    const { data: existingRow } = await supabase
      .from("inverter_alarms")
      .select("id, notified_at")
      .eq("inverter_id", inv.id)
      .eq("error_code", alarm.errorCode)
      .eq("alarm_start_time", alarm.alarmStartTime)
      .maybeSingle();

    const isNew = !existingRow;
    const alreadyNotified = existingRow?.notified_at != null;

    const row = {
      user_id: inv.user_id,
      inverter_id: inv.id,
      device_sn: alarm.deviceSn,
      error_code: alarm.errorCode,
      alarm_name: alarm.alarmName ?? null,
      alarm_type: alarm.alarmType ?? null,
      alarm_level: alarm.alarmLevel ?? null,
      alarm_state: alarm.alarmState ?? 1,
      alarm_start_time: alarm.alarmStartTime,
      alarm_end_time: alarm.alarmEndTime ?? null,
    };

    const { error: upsertError } = await supabase
      .from("inverter_alarms")
      .upsert(row, { onConflict: "inverter_id,error_code,alarm_start_time" });

    if (upsertError) {
      console.error(`upsert alarm ${alarm.errorCode} failed:`, upsertError.message);
      continue;
    }
    alarmsUpserted += 1;

    // Trigger send-alert for new high-severity alarms only
    if (isNew && !alreadyNotified && (alarm.alarmLevel ?? 0) >= 2) {
      const triggered = await triggerSendAlert(
        supabase,
        supabaseUrl,
        serviceRoleKey,
        inv,
        alarm,
      );
      if (triggered) alertsTriggered += 1;
    }
  }

  return { alarms_seen: alarms.length, alarms_upserted: alarmsUpserted, alerts_triggered: alertsTriggered };
}

async function triggerSendAlert(
  supabase: SupabaseClient,
  supabaseUrl: string,
  serviceRoleKey: string,
  inv: UserInverter,
  alarm: SolaxAlarm,
): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-alert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        inverter_id: inv.id,
        user_id: inv.user_id,
        error_code: alarm.errorCode,
        alarm_name: alarm.alarmName,
        alarm_level: alarm.alarmLevel,
        alarm_start_time: alarm.alarmStartTime,
      }),
    });

    if (!response.ok) {
      console.warn(`send-alert returned ${response.status} for ${alarm.errorCode}`);
    }
  } catch (err) {
    console.error("send-alert invocation failed:", err);
    return false;
  }

  // Mark notified regardless of email backend status — send-alert is best effort
  // until Faza 6 (Resend integration). We at least record the intent.
  await supabase
    .from("inverter_alarms")
    .update({ notified_at: new Date().toISOString() })
    .eq("inverter_id", inv.id)
    .eq("error_code", alarm.errorCode)
    .eq("alarm_start_time", alarm.alarmStartTime!);

  return true;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
