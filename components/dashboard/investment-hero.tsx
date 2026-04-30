import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "./progress-ring";
import { CheckCircle2, TrendingUp, Calendar } from "lucide-react";
import { formatPln, formatMonthYear } from "@/lib/format";
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
  const primary = scenarios.real;
  const secondary = scenarios.solax;
  const grossPaid = installationCostPln + subsidyPln;

  return (
    <Card className="glass-strong h-full">
      <CardContent className="px-5 sm:px-6 py-5 sm:py-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Bilans inwestycji
          </h3>
          {primary.isReturned ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--savings)]/15 text-[var(--savings-foreground)] text-xs font-medium">
              <CheckCircle2 className="size-3" />
              Zwrócone
            </span>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
          Pieniądze które instalacja już Ci oszczędziła z kosztu{" "}
          <strong className="text-foreground">{formatPln(installationCostPln)}</strong> netto po dotacji.
        </p>

        {/* Centered ring */}
        <div className="flex justify-center mb-4">
          <ProgressRing
            size={220}
            thickness={16}
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
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Zwrócone
              </span>
              <span className="text-4xl font-semibold tabular-nums mt-1">
                {primary.progressPct.toFixed(0)}%
              </span>
              <span className="text-sm tabular-nums mt-1">
                {formatPln(primary.cumulativeNowPln)}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                z {formatPln(installationCostPln)}
              </span>
            </div>
          </ProgressRing>
        </div>

        {/* Two scenarios — visible explanations (per Michał's feedback) */}
        <div className="flex flex-col gap-3 mb-4">
          <ScenarioRow
            label="Realny tempo (PGE)"
            colorDot="bg-[var(--savings)]"
            description="Z faktur PGE i historycznego zużycia rodziny. Pokazuje pieniądze które fizycznie nie poszły do PGE — najbliższe prawdy."
            cumulative={primary.cumulativeNowPln}
            annual={primary.annualRatePln}
            eta={primary.breakEvenDate}
            isReturned={primary.isReturned}
          />
          <ScenarioRow
            label="Solax tempo"
            colorDot="bg-[var(--pv)]"
            description="Z bieżących pomiarów inwertera. Optymistyczne — Solax zaniża pobór z sieci, więc bilans wychodzi wyższy."
            cumulative={secondary.cumulativeNowPln}
            annual={secondary.annualRatePln}
            eta={secondary.breakEvenDate}
            isReturned={secondary.isReturned}
          />
        </div>

        {/* Footer with subsidy line */}
        <div className="text-xs text-muted-foreground border-t border-zinc-200/40 pt-3 mt-auto">
          Brutto wpłacone:{" "}
          <strong className="text-foreground">{formatPln(grossPaid)}</strong> ·{" "}
          <span className="text-[var(--savings)] font-medium">
            − {formatPln(subsidyPln)} dotacja Mój Prąd 4.0
          </span>{" "}
          · Net:{" "}
          <strong className="text-foreground">
            {formatPln(installationCostPln)}
          </strong>
        </div>
      </CardContent>
    </Card>
  );
}

function ScenarioRow({
  label,
  colorDot,
  description,
  cumulative,
  annual,
  eta,
  isReturned,
}: {
  label: string;
  colorDot: string;
  description: string;
  cumulative: number;
  annual: number;
  eta: Date;
  isReturned: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-lg bg-white/40">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`size-2 rounded-full shrink-0 ${colorDot}`} aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wide truncate">
            {label}
          </span>
        </div>
        <span className="text-base font-semibold tabular-nums">
          {formatPln(cumulative)}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug pl-3.5">
        {description}
      </p>
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
