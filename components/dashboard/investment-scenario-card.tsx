import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "./progress-ring";
import { CheckCircle2, TrendingUp, Calendar, Star } from "lucide-react";
import { formatPln, formatMonthYear } from "@/lib/format";
import type { RoiScenario } from "@/lib/derive/forecasts";

// One scenario, one ring. Used in pair (Realne PGE + Solax tempo) zamiast
// shared ProgressRing z dual progress który wprowadzał wizualną hierarchię
// niezgodną z prawdą (Solax = optymistyczny ale shorter ring sugerował że
// jest gorszy/słabszy a tak naprawdę jest po prostu zaniżony przez bug API).
export function InvestmentScenarioCard({
  variant,
  isAuthoritative,
  scenario,
  installationCostPln,
  label,
  description,
}: {
  variant: "real" | "solax";
  /** True dla "Realne PGE" — to jest scenariusz któremu user powinien ufać. */
  isAuthoritative: boolean;
  scenario: RoiScenario;
  installationCostPln: number;
  label: string;
  description: string;
}) {
  // Zielony brand dla Realne (truth), pomarańcz solar dla Solax (raporty)
  const palette =
    variant === "real"
      ? {
          dot: "var(--brand-600)",
          ringFrom: "#16A34A",
          ringTo: "#22C55E",
          accentText: "var(--brand-800)",
          accentBg: "var(--brand-50)",
          glow: "var(--brand-glow)",
        }
      : {
          dot: "var(--solar-600)",
          ringFrom: "#D97706",
          ringTo: "#F59E0B",
          accentText: "var(--solar-800)",
          accentBg: "var(--solar-50)",
          glow: "var(--solar-glow)",
        };

  return (
    <Card className="glass-strong h-full">
      <CardContent className="px-5 py-5 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-1 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="size-2 rounded-full shrink-0"
              style={{
                background: palette.dot,
                boxShadow: `0 0 8px ${palette.glow}`,
              }}
              aria-hidden
            />
            <h3 className="text-xs font-semibold uppercase tracking-wide truncate">
              {label}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isAuthoritative && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{
                  background: palette.accentBg,
                  color: palette.accentText,
                }}
                title="Tej liczbie ufamy najbardziej — bazuje na fakturach PGE"
              >
                <Star className="size-2.5 fill-current" />
                wiarygodne
              </span>
            )}
            {scenario.isReturned && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  background: "var(--brand-100)",
                  color: "var(--brand-800)",
                }}
              >
                <CheckCircle2 className="size-2.5" />
                Zwrócone
              </span>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
          {description}
        </p>

        {/* Centered ring (smaller niż było w shared hero) */}
        <div className="flex justify-center mb-3">
          <ProgressRing
            size={160}
            thickness={14}
            primary={{
              pct: scenario.progressPct,
              gradientId: `ring-${variant}`,
              from: palette.ringFrom,
              to: palette.ringTo,
            }}
          >
            <div className="flex flex-col items-center leading-none">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Zwrócone
              </span>
              <span className="text-3xl font-semibold tabular-nums mt-1">
                {scenario.progressPct.toFixed(0)}%
              </span>
              <span className="text-[12px] tabular-nums mt-1">
                {formatPln(scenario.cumulativeNowPln)}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                z {formatPln(installationCostPln)}
              </span>
            </div>
          </ProgressRing>
        </div>

        {/* Bottom KPIs */}
        <div className="flex items-center justify-between gap-3 text-[12px] tabular-nums mt-auto pt-3 border-t border-zinc-200/40">
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="size-3.5" style={{ color: palette.dot }} />
            <span className="font-semibold">
              {formatPln(scenario.annualRatePln)}
            </span>
            <span className="text-muted-foreground">/rok</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5 text-muted-foreground" />
            {scenario.isReturned ? (
              <span className="font-medium" style={{ color: palette.accentText }}>
                już zwrócone
              </span>
            ) : (
              <span>
                <span className="text-muted-foreground">Próg:</span>{" "}
                <span className="font-semibold">
                  {formatMonthYear(scenario.breakEvenDate)}
                </span>
              </span>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
