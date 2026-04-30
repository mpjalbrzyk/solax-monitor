import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardHeader } from "@/components/dashboard/header";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { InfoHint } from "@/components/dashboard/info-hint";
import { GLOSSARY } from "@/lib/copy/glossary";
import {
  ForecastChart,
  type ForecastPoint,
} from "@/components/charts/forecast-chart";
import { CheckCircle2, Wallet, Sun, ArrowUpFromLine, Zap, Receipt, Clock } from "lucide-react";
import {
  getActiveInverter,
  getCumulativeFinancials,
  getDailyAggregates,
  getHistoricalConsumption,
  getHistoricalPgeInvoices,
  getPgeInvoices,
  getTariffComponents,
} from "@/lib/data/queries";
import { todayWarsaw, shiftDateString, PL_MONTH_SHORT } from "@/lib/date";
import {
  formatPln,
  formatKwh,
  formatPercent,
  formatNumber,
  formatDateLong,
} from "@/lib/format";
import { calculatePgeActualSavings } from "@/lib/tariff";

export const metadata = { title: "Finanse" };
export const dynamic = "force-dynamic";

export default async function FinancialPage() {
  const inverter = await getActiveInverter();
  if (!inverter) {
    return (
      <>
        <DashboardHeader title="Finanse" recordedAt={null} />
        <Card className="glass">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Brak instalacji w bazie.
          </CardContent>
        </Card>
      </>
    );
  }

  const today = todayWarsaw();
  const oneYearAgo = shiftDateString(today, -365);

  const [cumulative, lastYearDailies, history, pgeInvoices, components, invoiceDocs] =
    await Promise.all([
      getCumulativeFinancials(inverter.id),
      getDailyAggregates(inverter.id, oneYearAgo, today),
      getHistoricalConsumption(inverter.id),
      getHistoricalPgeInvoices(inverter.id),
      getTariffComponents(inverter.id),
      getPgeInvoices(inverter.id),
    ]);

  // === SOLAX-REPORTED (z daily_aggregates) ===
  const solaxNet = cumulative.total_net_pln;
  const solaxSavings = cumulative.total_savings_pln;
  const solaxEarnings = cumulative.total_earnings_pln;
  const solaxCost = cumulative.total_cost_pln;
  const solaxYield = cumulative.total_yield_kwh;
  const daysWithData = cumulative.days_count;

  // === PGE-ACTUAL (z 37 mies. PGE invoices + tariff_components) ===
  // Liczymy per miesiąc: hipotetyczny koszt bez PV (avg pre-PV × cena/kWh dla
  // tego miesiąca) minus actual_cost (import × cena/kWh) plus deposit z RCE.
  // To radykalnie precyzyjniejsze niż stara logika "× ratePln × lat".
  const installDate = inverter.installation_date
    ? new Date(inverter.installation_date)
    : null;
  const yearsSinceInstall = installDate
    ? (Date.now() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    : 0;

  const prePvYears = history.filter((h) => h.year < 2023);
  const avgPrePvKwhYearly =
    prePvYears.length > 0
      ? prePvYears.reduce(
          (s, h) => s + Number(h.consumption_from_grid_kwh ?? 0),
          0,
        ) / prePvYears.length
      : 5959;
  const avgPrePvMonthlyKwh = avgPrePvKwhYearly / 12;

  const pgeActual = calculatePgeActualSavings({
    invoices: pgeInvoices,
    components,
    avgPrePvMonthlyKwh,
  });

  const pgeActualSavings = pgeActual.totalSavings;
  const pgeMonthsCounted = pgeActual.monthsCounted;
  const totalActualPaid = pgeActual.totalActualCost;
  const totalDepositPln = pgeActual.totalDepositPln;

  // === BREAK-EVEN ===
  const breakEvenTarget = Number(inverter.installation_cost_pln ?? 24000);
  const subsidy = Number(inverter.installation_subsidy_pln ?? 0);
  const grossPaid = breakEvenTarget + subsidy;

  // Use the better estimate available — PGE-actual if we have post-PV history,
  // otherwise Solax-reported.
  const bestEstimateNet =
    pgeActualSavings > solaxNet ? pgeActualSavings : solaxNet;
  const progressPct = breakEvenTarget > 0
    ? Math.min((bestEstimateNet / breakEvenTarget) * 100, 100)
    : 0;
  const isReturned = bestEstimateNet >= breakEvenTarget;

  // === FORECAST ===
  // Trend: średnie roczne savings na bazie ostatnich 365 dni daily_aggregates.
  const recentNet = lastYearDailies.reduce(
    (s, d) => s + (Number(d.net_balance_pln) || 0),
    0,
  );
  const projectedAnnualNet = recentNet > 0 ? recentNet : bestEstimateNet / Math.max(yearsSinceInstall, 0.1);

  const currentYear = Number(today.slice(0, 4));
  const startYear = installDate ? installDate.getFullYear() : currentYear - 3;
  const forecastData: ForecastPoint[] = [];
  let cumulativeFor = 0;
  for (let year = startYear; year <= 2035; year++) {
    const isProjection = year > currentYear;
    if (year === startYear) {
      // Zacznij od momentu instalacji (luty 2023)
      cumulativeFor = 0;
    } else if (year <= currentYear) {
      // Lata historyczne: użyj pgeActual prorated
      cumulativeFor = (bestEstimateNet * (year - startYear + 1)) /
        Math.max(yearsSinceInstall, 1);
    } else {
      // Prognoza: dorzuć projected annual net
      cumulativeFor += projectedAnnualNet;
    }
    forecastData.push({
      yearLabel: String(year),
      cumulative_pln: Math.round(cumulativeFor),
      isProjection,
    });
  }

  // Find break-even year visually
  const breakEvenYear = forecastData.find(
    (p) => p.cumulative_pln >= breakEvenTarget,
  )?.yearLabel;

  // === LAST 12 MONTHS TABLE ===
  // Aggregate dailies into months
  const monthlySums = new Map<
    string,
    { yield_kwh: number; savings_pln: number; cost_pln: number; earnings_pln: number; net_pln: number }
  >();
  for (const d of lastYearDailies) {
    const ym = d.date.slice(0, 7);
    const acc = monthlySums.get(ym) ?? {
      yield_kwh: 0,
      savings_pln: 0,
      cost_pln: 0,
      earnings_pln: 0,
      net_pln: 0,
    };
    acc.yield_kwh += Number(d.yield_kwh ?? 0);
    acc.savings_pln += Number(d.savings_pln ?? 0);
    acc.cost_pln += Number(d.cost_pln ?? 0);
    acc.earnings_pln += Number(d.earnings_pln ?? 0);
    acc.net_pln += Number(d.net_balance_pln ?? 0);
    monthlySums.set(ym, acc);
  }
  const tableRows = Array.from(monthlySums.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12);

  return (
    <>
      <DashboardHeader title="Finanse" recordedAt={null} />

      {/* === Hero: break-even progress === */}
      <Card className="glass-strong mb-4">
        <CardContent className="px-5 sm:px-6 py-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5">
                  <span>Bilans inwestycji</span>
                  <InfoHint>{GLOSSARY.bilansInwestycji}</InfoHint>
                </div>
                <div className="text-3xl sm:text-4xl font-semibold tabular-nums">
                  {formatPln(bestEstimateNet)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  z {formatPln(breakEvenTarget)} netto po dotacji
                </div>
              </div>
              {isReturned ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--savings)]/15 text-[var(--savings-foreground)] text-sm font-medium">
                  <CheckCircle2 className="size-4" />
                  Zwrócone
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--pv)]/15 text-[var(--pv-foreground)] text-sm font-medium">
                  {formatPercent(progressPct)} drogi
                </span>
              )}
            </div>
            <Progress value={progressPct} className="h-2" />
            <p className="text-sm leading-relaxed text-foreground/80">
              {buildFinancialHeroComment({
                bestEstimateNet,
                breakEvenTarget,
                progressPct,
                isReturned,
                yearsSinceInstall,
                projectedAnnualNet,
              })}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Brutto wpłacone: {formatPln(grossPaid)} · Dotacja Mój Prąd:{" "}
                {formatPln(subsidy)}
              </span>
              {breakEvenYear && (
                <span className="flex items-center gap-1.5">
                  Próg zwrotu: <strong>{breakEvenYear}</strong>
                  <InfoHint>{GLOSSARY.progZwrotu}</InfoHint>
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === Two-source comparison === */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <span>Solax-reported</span>
              <InfoHint>{GLOSSARY.solaxReported}</InfoHint>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Suma z {daysWithData} dni rozliczonych przez Edge Function
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {formatPln(solaxNet)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Niedoszacowane — Solax raportuje zaniżony pobór z sieci. Faktura
              PGE pokazuje znacznie więcej.
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <span>PGE-actual</span>
              <InfoHint>{GLOSSARY.pgeActual}</InfoHint>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Z faktur PGE i historycznego zużycia rodziny przed PV
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {formatPln(pgeActualSavings)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {pgeMonthsCounted} mies. z faktur PGE · pre-PV avg{" "}
              {formatNumber(avgPrePvKwhYearly, 0)} kWh/rok
            </div>
          </CardContent>
        </Card>
      </section>

      {/* === Breakdown === */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiTile
          icon={Sun}
          label="Produkcja PV (lifetime)"
          value={formatKwh(solaxYield, 1)}
          sub={`${daysWithData} dni z danymi`}
          tone="pv"
          hint={GLOSSARY.produkcjaLifetime}
        />
        <KpiTile
          icon={Wallet}
          label="Oszczędności z autokonsumpcji"
          value={formatPln(solaxSavings)}
          sub="produkcja zużyta na miejscu"
          tone="savings"
          hint={GLOSSARY.autokonsumpcja}
        />
        <KpiTile
          icon={ArrowUpFromLine}
          label="Przychód z eksportu (RCEm)"
          value={formatPln(solaxEarnings)}
          sub="net-billing"
          tone="export"
          hint={GLOSSARY.rcem}
        />
        <KpiTile
          icon={Zap}
          label="Koszt poboru z sieci"
          value={formatPln(solaxCost)}
          sub="zmienna część taryfy"
          tone="import"
          hint={GLOSSARY.importPobor}
        />
      </section>

      {/* === Forecast === */}
      <Card className="glass mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Prognoza bilansu do 2035
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Na bazie tempa z ostatnich 365 dni — prosta ekstrapolacja
            liniowa, bez zakładania dalszego wzrostu cen energii
          </p>
        </CardHeader>
        <CardContent>
          <ForecastChart data={forecastData} breakEvenPln={breakEvenTarget} />
          {projectedAnnualNet > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              Tempo: ~{formatPln(projectedAnnualNet)} rocznie · 5 lat naprzód:{" "}
              <strong className="text-foreground">
                +{formatPln(projectedAnnualNet * 5)}
              </strong>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === PGE invoices history === */}
      {invoiceDocs.length > 0 && (
        <Card className="glass mb-4">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" />
              Faktury PGE — historia rozliczeń
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {invoiceDocs.length} dokumentów
            </span>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="overflow-x-auto -mx-5 sm:mx-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground border-b border-zinc-200/60">
                    <th className="px-5 sm:px-3 py-2 font-medium">Numer</th>
                    <th className="px-3 py-2 font-medium hidden sm:table-cell">Typ</th>
                    <th className="px-3 py-2 font-medium">Wystawiona</th>
                    <th className="px-3 py-2 font-medium hidden md:table-cell">Okres</th>
                    <th className="px-3 py-2 font-medium text-right">Do zapłaty</th>
                    <th className="px-5 sm:px-3 py-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceDocs.map((doc) => (
                    <tr
                      key={doc.invoice_no}
                      className="border-b border-zinc-100/60 hover:bg-white/30"
                    >
                      <td className="px-5 sm:px-3 py-2 whitespace-nowrap font-mono text-xs">
                        {doc.invoice_no}
                      </td>
                      <td className="px-3 py-2 hidden sm:table-cell">
                        {invoiceTypeLabel(doc.invoice_type)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                        {doc.issued_date}
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                        {doc.period_from && doc.period_to
                          ? `${doc.period_from.slice(0, 7)} → ${doc.period_to.slice(0, 7)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatPln(doc.amount_after_deposit_pln ?? doc.amount_brutto_pln, true)}
                      </td>
                      <td className="px-5 sm:px-3 py-2 text-right">
                        <InvoiceStatusBadge status={doc.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 sm:px-3 pt-3 text-xs text-muted-foreground">
              Łącznie zapłacone PGE od początku:{" "}
              <strong className="text-foreground">
                {formatPln(
                  invoiceDocs
                    .filter((d) => d.status === "paid" || d.status === "paid_late")
                    .reduce(
                      (s, d) =>
                        s + Number(d.amount_after_deposit_pln ?? d.amount_brutto_pln ?? 0),
                      0,
                    ),
                )}
              </strong>{" "}
              za 35 mies. rozliczeń.
            </p>
          </CardContent>
        </Card>
      )}

      {/* === Last 12 months table === */}
      {tableRows.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Ostatnie 12 miesięcy
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="overflow-x-auto -mx-5 sm:mx-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground border-b border-zinc-200/60">
                    <th className="px-5 sm:px-3 py-2 font-medium">Miesiąc</th>
                    <th className="px-3 py-2 font-medium text-right">Produkcja</th>
                    <th className="px-3 py-2 font-medium text-right">Oszczędności</th>
                    <th className="px-3 py-2 font-medium text-right hidden sm:table-cell">Eksport</th>
                    <th className="px-3 py-2 font-medium text-right hidden sm:table-cell">Koszt</th>
                    <th className="px-5 sm:px-3 py-2 font-medium text-right">Bilans</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(([ym, sums]) => {
                    const monthIdx = Number(ym.slice(5)) - 1;
                    const year = ym.slice(0, 4);
                    return (
                      <tr
                        key={ym}
                        className="border-b border-zinc-100/60 hover:bg-white/30"
                      >
                        <td className="px-5 sm:px-3 py-2 whitespace-nowrap">
                          {PL_MONTH_SHORT[monthIdx]} {year}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatKwh(sums.yield_kwh, 0)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatPln(sums.savings_pln)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums hidden sm:table-cell">
                          {formatPln(sums.earnings_pln, true)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums hidden sm:table-cell">
                          −{formatPln(sums.cost_pln, true)}
                        </td>
                        <td className="px-5 sm:px-3 py-2 text-right tabular-nums font-medium">
                          {formatPln(sums.net_pln)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {installDate && (
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Instalacja działa od {formatDateLong(inverter.installation_date)} ·{" "}
          {formatNumber(yearsSinceInstall, 1)} lat
        </p>
      )}
    </>
  );
}

function buildFinancialHeroComment(args: {
  bestEstimateNet: number;
  breakEvenTarget: number;
  progressPct: number;
  isReturned: boolean;
  yearsSinceInstall: number;
  projectedAnnualNet: number;
}): string {
  const { bestEstimateNet, breakEvenTarget, isReturned, yearsSinceInstall, projectedAnnualNet } = args;
  if (isReturned) {
    const overflow = bestEstimateNet - breakEvenTarget;
    return `Instalacja zwróciła się i pracuje już na czysty zysk — masz ${formatPln(overflow)} ponad próg ${formatPln(breakEvenTarget)} netto.`;
  }
  const remaining = breakEvenTarget - bestEstimateNet;
  if (projectedAnnualNet > 0) {
    const yearsLeft = remaining / projectedAnnualNet;
    return `Brakuje ${formatPln(remaining)} do zwrotu netto. Przy obecnym tempie ~${formatPln(projectedAnnualNet)}/rok zwrot za ~${yearsLeft.toFixed(1)} lat (po ${formatNumber(yearsSinceInstall + yearsLeft, 1)} latach od montażu).`;
  }
  return `Brakuje ${formatPln(remaining)} do zwrotu netto.`;
}

function invoiceTypeLabel(t: string): string {
  switch (t) {
    case "settlement":
      return "Rozliczenie";
    case "forecast":
      return "Prognoza";
    case "correction":
      return "Korekta";
    case "interest":
      return "Odsetki";
    default:
      return t;
  }
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string; icon?: typeof CheckCircle2 }> = {
    paid: {
      label: "Zapłacona",
      cls: "bg-[var(--savings)]/15 text-[var(--savings-foreground)]",
      icon: CheckCircle2,
    },
    paid_late: {
      label: "Po terminie",
      cls: "bg-[var(--pv)]/15 text-[var(--pv-foreground)]",
      icon: CheckCircle2,
    },
    pending: {
      label: "Oczekuje",
      cls: "bg-zinc-200/40 text-muted-foreground",
      icon: Clock,
    },
    compensated: {
      label: "Skompensowana",
      cls: "bg-[var(--grid-export)]/15 text-foreground",
    },
    cancelled: {
      label: "Anulowana",
      cls: "bg-zinc-200/40 text-muted-foreground",
    },
  };
  const c = config[status] ?? { label: status, cls: "bg-zinc-200/40" };
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.cls}`}>
      {Icon && <Icon className="size-3" />}
      {c.label}
    </span>
  );
}
