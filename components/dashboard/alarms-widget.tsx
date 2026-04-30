import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateShort, formatTime } from "@/lib/format";
import type { InverterAlarm } from "@/lib/data/types";

export function AlarmsWidget({
  alarms,
  daysWindow = 30,
}: {
  alarms: InverterAlarm[];
  daysWindow?: number;
}) {
  const ongoing = alarms.filter((a) => a.alarm_state === 1);
  const recent = alarms.slice(0, 5);

  return (
    <Card className="glass">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">
          Alarmy i błędy
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          ostatnie {daysWindow} dni
        </span>
      </CardHeader>
      <CardContent>
        {alarms.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-[var(--savings)]" />
            <span>Bez alarmów. Instalacja pracuje normalnie.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {ongoing.length > 0 && (
              <div className="text-xs text-[var(--grid-import)] font-medium">
                Aktywne: {ongoing.length}
              </div>
            )}
            <ul className="flex flex-col gap-2">
              {recent.map((alarm) => (
                <li
                  key={alarm.id}
                  className="flex items-start gap-2 text-sm py-1"
                >
                  <AlertTriangle
                    className={`size-4 mt-0.5 shrink-0 ${
                      alarm.alarm_state === 1
                        ? "text-[var(--grid-import)]"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {alarm.alarm_name ?? `Błąd ${alarm.error_code}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateShort(alarm.alarm_start_time)} ·{" "}
                      {formatTime(alarm.alarm_start_time)}
                      {alarm.alarm_state === 0 && " · zamknięty"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {alarms.length > 5 && (
              <div className="text-xs text-muted-foreground pt-1">
                +{alarms.length - 5} starszych
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
