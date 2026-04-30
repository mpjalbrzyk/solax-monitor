import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "./progress-ring";
import { InfoHint } from "./info-hint";
import { CheckCircle2, TrendingUp, Calendar } from "lucide-react";
import { formatPln, formatMonthYear, formatNumber } from "@/lib/format";
import type { RoiScenario } from "@/lib/derive/forecasts";

export function InvestmentHero({
  installationCostPln,
  subsidyPln,
  scenarios,
}: {
  installationCostPln: number;
  subsidyPln: number;
  scenarios: { solax: RoiScenario; real: RoiScenario };
}) {
  // Use the realny scenario for primary ring (more honest), Solax for secondary
  const primary = scenarios.real;
  const secondary = scenarios.solax;
  const grossPaid = installationCostPln + subsidyPln;

  return (
    <Card className="glass-strong">
      <CardContent className="px-5 sm:px-6 py-5 sm:py-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              Bilans inwestycji
              <InfoHint>
                Pokazujemy dwa scenariusze: Realny (zewnętrzny ring) z faktur
                PGE — pieniądze które faktycznie nie poszły do PGE. Solax
                (wewnętrzny ring) z pomiarów inwertera — optymistyczny, bo
                Solax zaniża pobór z sieci.
              </InfoHint>
            </h3>
            {primary.isReturned ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--savings)]/15 text-[var(--savings-foreground)] text-xs font-medium">
                <CheckCircle2 className="size-3" />
                Zwrócone
              </span>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <ProgressRing
              size={200}
              thickness={14}
              primary={{
                pct: primary.progressPct,
                gradientId: "ring-primary",
                from: "oklch(0.68 0.16 155)",
                to: "oklch(0.78 0.15 130)",
              }}
              secondary={{
                pct: secondary.progressPct,
                gradientId: "ring-secondary",
                from: "oklch(0.74 0.17 60)",
                to: "oklch(0.78 0.16 80)",
              }}
            >
              <div className="flex flex-col items-center leading-none">
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  z {formatPln(installationCostPln)}
                </span>
                <span className="text-3xl font-semibold tabular-nums mt-1">
                  {primary.progressPct.toFixed(0)}%
                </span>
                <span className="text-xs text-muted-foreground tabular-nums mt-1">
                  {formatPln(primary.cumulativeNowPln)}
                </span>
              </div>
            </ProgressRing>

            <div className="flex-1 flex flex-col gap-3 w-full">
              {/* Realny tempo (primary) */}
              <ScenarioRow
                label={primary.label}
                colorBar="bg-gradient-to-r from-[var(--savings)] to-[oklch(0.78_0.15_130)]"
                cumulative={primary.cumulativeNowPln}
                annual={primary.annualRatePln}
                eta={primary.breakEvenDate}
                isReturned={primary.isReturned}
              />
              {/* Solax tempo (secondary) */}
              <ScenarioRow
                label={secondary.label}
                colorBar="bg-gradient-to-r from-[var(--pv)] to-[oklch(0.78_0.16_80)]"
                cumulative={secondary.cumulativeNowPln}
                annual={secondary.annualRatePln}
                eta={secondary.breakEvenDate}
                isReturned={secondary.isReturned}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground border-t border-zinc-200/40 pt-3">
            Brutto wpłacone: <strong className="text-foreground">{formatPln(grossPaid)}</strong> ·{" "}
            <span className="text-[var(--savings)] font-medium">
              − {formatPln(subsidyPln)} dotacja Mój Prąd 4.0
            </span>{" "}
            · Net: <strong className="text-foreground">{formatPln(installationCostPln)}</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ScenarioRow({
  label,
  colorBar,
  cumulative,
  annual,
  eta,
  isReturned,
}: {
  label: string;
  colorBar: string;
  cumulative: number;
  annual: number;
  eta: Date;
  isReturned: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`size-1.5 rounded-full shrink-0 ${colorBar}`} aria-hidden />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">
            {label}
          </span>
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {formatPln(cumulative)}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums pl-3.5">
        <span className="inline-flex items-center gap-1">
          <TrendingUp className="size-3" />
          {formatPln(annual)}/rok
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="size-3" />
          {isReturned ? (
            <span className="text-[var(--savings-foreground)] font-medium">
              już zwrócone
            </span>
          ) : (
            <>Próg: {formatMonthYear(eta)}</>
          )}
        </span>
      </div>
    </div>
  );
}
