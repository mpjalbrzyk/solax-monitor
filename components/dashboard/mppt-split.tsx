import { Card, CardContent } from "@/components/ui/card";
import { InfoHint } from "./info-hint";
import { formatPower } from "@/lib/format";

// Per-string production split. Falownik X3-Hybrid G4 10.0-M ma 2 MPPT (Maximum
// Power Point Tracker) wejścia DC. Pokazujemy moc obu stringów osobno —
// pomaga wcześnie wykryć zacienienie albo awarię jednego stringa
// (Enphase wisdom: jeśli jeden string radykalnie spada, prawdopodobnie cień
// rzucany przez drzewo / komin / zabrudzenie paneli).

type MpptMap = {
  MPPT1Power?: number;
  MPPT2Power?: number;
  MPPT1Voltage?: number;
  MPPT2Voltage?: number;
  MPPT1Current?: number;
  MPPT2Current?: number;
  [k: string]: number | undefined;
};

export function MpptSplitTile({ mppt }: { mppt: MpptMap | null }) {
  if (!mppt) return null;

  const p1 = Number(mppt.MPPT1Power ?? 0);
  const p2 = Number(mppt.MPPT2Power ?? 0);
  const total = p1 + p2;

  // Don't show at night when both are zero
  if (total < 50) return null;

  const p1Pct = total > 0 ? (p1 / total) * 100 : 0;
  const p2Pct = total > 0 ? (p2 / total) * 100 : 0;

  // Detect a stuck/shaded string (one MPPT producing < 30% of the other)
  const ratio = p1 > 0 && p2 > 0 ? Math.min(p1, p2) / Math.max(p1, p2) : 1;
  const possibleShade = ratio < 0.3 && total > 500;

  return (
    <Card className="glass">
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            Stringi PV (MPPT1 / MPPT2)
            <InfoHint>
              Twój falownik ma dwa wejścia DC, każde z osobnym śledzeniem
              maksymalnej mocy (MPPT). Pokazujemy oba osobno — jeśli jeden
              string spada drastycznie poniżej drugiego, zwykle oznacza
              zacienienie (drzewo, komin) albo zabrudzenie paneli.
            </InfoHint>
          </span>
          {possibleShade && (
            <span className="text-[10px] uppercase tracking-wide text-[var(--grid-import)] font-medium">
              Możliwe zacienienie
            </span>
          )}
        </div>

        {/* Two-column comparison */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <div className="text-xs text-muted-foreground">String 1</div>
            <div className="text-lg font-semibold tabular-nums">
              {formatPower(p1)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">String 2</div>
            <div className="text-lg font-semibold tabular-nums">
              {formatPower(p2)}
            </div>
          </div>
        </div>

        {/* Visual ratio bar */}
        <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-100">
          <div
            className="bg-[var(--pv)]"
            style={{ width: `${p1Pct}%` }}
            title={`String 1: ${p1Pct.toFixed(0)}%`}
          />
          <div
            className="bg-[var(--pv)]/60"
            style={{ width: `${p2Pct}%` }}
            title={`String 2: ${p2Pct.toFixed(0)}%`}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
          <span>Razem: {formatPower(total)}</span>
          <span>{p1Pct.toFixed(0)}% / {p2Pct.toFixed(0)}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
