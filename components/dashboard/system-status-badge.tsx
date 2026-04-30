import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import type { InverterAlarm } from "@/lib/data/types";

// Zero-click answer to "Czy mój system działa poprawnie?" (research insight,
// fundamental B2C question). Three states with traffic-light semantics:
//
//   green  — pipeline live + no ongoing alarms + recent reading
//   yellow — pipeline stale (>30 min old) OR low-severity alarm OR efficiency
//            warning ("wydajność spadła, umyj panele")
//   red    — pipeline dead (>2h old) OR critical alarm

export type SystemStatus = "ok" | "attention" | "fault";

export function deriveSystemStatus(args: {
  recordedAt: string | null;
  alarms: InverterAlarm[];
}): { status: SystemStatus; label: string; detail: string } {
  const { recordedAt, alarms } = args;
  const ongoingAlarms = alarms.filter((a) => a.alarm_state === 1);
  const criticalAlarms = ongoingAlarms.filter((a) => (a.alarm_level ?? 0) >= 3);

  const now = Date.now();
  const ageMs = recordedAt ? now - new Date(recordedAt).getTime() : Infinity;
  const ageMin = ageMs / (1000 * 60);

  if (criticalAlarms.length > 0) {
    return {
      status: "fault",
      label: "Awaria",
      detail: `Krytyczny błąd: ${criticalAlarms[0].alarm_name ?? criticalAlarms[0].error_code}`,
    };
  }

  if (ageMin > 120) {
    return {
      status: "fault",
      label: "Brak danych",
      detail: `Pipeline nie odbiera danych od ${Math.round(ageMin / 60)}h — sprawdź falownik`,
    };
  }

  if (ongoingAlarms.length > 0) {
    return {
      status: "attention",
      label: "Wymaga uwagi",
      detail: `Aktywne alarmy: ${ongoingAlarms.length}`,
    };
  }

  if (ageMin > 30) {
    return {
      status: "attention",
      label: "Dane nieświeże",
      detail: `Ostatnie dane sprzed ${Math.round(ageMin)} min`,
    };
  }

  return {
    status: "ok",
    label: "System OK",
    detail: "Instalacja pracuje normalnie",
  };
}

export function SystemStatusBadge({
  status,
  label,
  detail,
}: {
  status: SystemStatus;
  label: string;
  detail: string;
}) {
  const config = {
    ok: {
      Icon: CheckCircle2,
      bg: "bg-[var(--savings)]/15",
      ring: "shadow-[inset_0_0_0_1px_oklch(0.85_0.08_155_/_0.5)]",
      iconColor: "text-[var(--savings)]",
      pulse: true,
    },
    attention: {
      Icon: AlertTriangle,
      bg: "bg-[var(--pv)]/15",
      ring: "shadow-[inset_0_0_0_1px_oklch(0.88_0.1_60_/_0.5)]",
      iconColor: "text-[var(--pv)]",
      pulse: false,
    },
    fault: {
      Icon: AlertCircle,
      bg: "bg-[var(--grid-import)]/15",
      ring: "shadow-[inset_0_0_0_1px_oklch(0.85_0.12_25_/_0.5)]",
      iconColor: "text-[var(--grid-import)]",
      pulse: false,
    },
  }[status];

  const { Icon, bg, ring, iconColor, pulse } = config;

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full ${bg} ${ring} backdrop-blur-sm`}
    >
      <span className="relative flex items-center justify-center">
        {pulse && (
          <span
            className={`absolute inline-flex h-2 w-2 rounded-full ${iconColor.replace("text-", "bg-")} opacity-50 animate-ping`}
            aria-hidden
          />
        )}
        <Icon className={`size-4 ${iconColor}`} />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[10px] text-muted-foreground">{detail}</span>
      </div>
    </div>
  );
}
