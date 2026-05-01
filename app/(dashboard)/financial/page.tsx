import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardHeader } from "@/components/dashboard/header";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { InfoHint } from "@/components/dashboard/info-hint";
import { GLOSSARY } from "@/lib/copy/glossary";
import { BreakEvenChart } from "@/components/charts/break-even-chart";
import { AvoidedExportDonut } from "@/components/charts/avoided-export-donut";
import { LongTermForecastChart } from "@/components/charts/long-term-forecast-chart";
import {
  buildBreakEvenCurve,
  buildLongTermForecast,
  buildRoiScenarios,
} from "@/lib/derive/forecasts";
import { calculatePgeActualSavings, getEffectivePricePerKwhBrutto, getMonthlyFixedFromComponents } from "@/lib/tariff";
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
  const solaxCost = cumulative.total_cost_pln;
  const solaxYield = cumulative.total_yield_kwh;
  const daysWithData = cumulative.days_count;

  // === EKSPORT (audit A.6 fix) ===
  // Solax raportuje eksport zaniżony tak samo jak import — solaxEarnings =
  // 1.70 zł rocznie wbrew faktycznym ~330 zł rocznie. Lepsze źródło:
  // historical_pge_invoices.deposit_value_pln × multiplier.
  const pgeDepositTotal = pgeInvoices.reduce(
    (s, inv) => s + Number(inv.deposit_value_pln ?? 0),
    0,
  );
  const pgeExportKwhTotal = pgeInvoices.reduce(
    (s, inv) => s + Number(inv.grid_export_kwh ?? 0),
    0,
  );

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

  // === BREAK-EVEN — TWO SCENARIOS ===
  const breakEvenTarget = Number(inverter.installation_cost_pln ?? 24000);
  const subsidy = Number(inverter.installation_subsidy_pln ?? 0);
  const grossPaid = breakEvenTarget + subsidy;

  const solaxAnnualRate = lastYearDailies.reduce(
    (s, d) => s + (Number(d.net_balance_pln) || 0),
    0,
  );

  // Last-12-months realne tempo from PGE invoices (apples-to-apples with
  // Solax's last-365-day window). Without this, realne tempo gets dragged
  // down by 2023 RCEm prices that no longer represent today's economics.
  const sortedInvoices = [...pgeInvoices].sort((a, b) =>
    b.month_date.localeCompare(a.month_date),
  );
  const last12 = sortedInvoices.slice(0, 12);
  let pgeLast12mRate = 0;
  if (last12.length === 12 && components.length > 0) {
    const last12Result = calculatePgeActualSavings({
      invoices: last12,
      components,
      avgPrePvMonthlyKwh: avgPrePvKwhYearly / 12,
    });
    pgeLast12mRate = last12Result.totalSavings;
  }

  const scenarios = buildRoiScenarios({
    installationDate: installDate ?? new Date("2023-02-17"),
    installationCostPln: breakEvenTarget,
    solaxCumulativeNet: solaxNet,
    solaxAnnualRate,
    pgeCumulativeSavings: pgeActualSavings,
    pgeLast12mRate,
  });

  // Long-term forecast (Tesla style) — 25 years ahead with 3 price scenarios
  const longTermForecast = buildLongTermForecast({
    baseAnnualRatePln: scenarios.real.annualRatePln,
    yearsToProject: 25,
    panelDegradationPctPerYear: 0.5,
  });

  // Best-estimate (used for hero) — primary is real, fallback to solax
  const bestEstimateNet = scenarios.real.cumulativeNowPln > 0
    ? scenarios.real.cumulativeNowPln
    : scenarios.solax.cumulativeNowPln;
  const progressPct = scenarios.real.progressPct;
  const isReturned = scenarios.real.isReturned || scenarios.solax.isReturned;

  // Break-even chart curve
  const breakEvenCurve = buildBreakEvenCurve({
    installationDate: installDate ?? new Date("2023-02-17"),
    installationCostPln: breakEvenTarget,
    scenarios,
    yearsAhead: 8,
  });

  // For backward-compat with later UI (hero comment, forecast section labels)
  const projectedAnnualNet = scenarios.real.annualRatePln;
  const breakEvenYear =
    scenarios.real.breakEvenYear !== Infinity
      ? String(scenarios.real.breakEvenYear)
      : null;

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

      {/* === A.7: Z czego się składa bilans inwestycji === */}
      <Card className="glass mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Z czego się składa Twój bilans
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Bilans inwestycji to suma trzech strumieni pieniędzy minus jeden
            koszt. Każdy element liczony z innego źródła — dlatego rozkładamy
            jak na fakturze.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <BreakdownRow
              sign="+"
              label="Autokonsumpcja"
              value={formatPln(solaxSavings)}
              note="energia ze słońca zużyta od razu w domu × cena G11 brutto"
              tone="savings"
            />
            <BreakdownRow
              sign="+"
              label="Depozyt prosumencki (eksport)"
              value={formatPln(pgeDepositTotal)}
              note={`${formatKwh(pgeExportKwhTotal, 0)} oddane × RCEm/RCE z 37 faktur PGE`}
              tone="export"
            />
            <BreakdownRow
              sign="−"
              label="Koszt poboru z sieci"
              value={formatPln(solaxCost)}
              note="zaniżone przez Solax, faktyczne ~330 zł/rok wg PGE"
              tone="import"
            />
            <div className="border-t border-zinc-200/40 pt-2.5 mt-2.5 flex items-center justify-between">
              <span className="font-semibold">= Bilans (Solax-reported)</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatPln(solaxSavings + pgeDepositTotal - solaxCost)}
              </span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
            Realny bilans (z faktur PGE) to{" "}
            <strong>{formatPln(scenarios.real.cumulativeNowPln)}</strong> —
            uwzględnia hipotetyczne życie bez fotowoltaiki, nie tylko Solax-reported.
          </p>
        </CardContent>
      </Card>

      {/* === Two-source comparison — VISIBLE descriptions per Michał === */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--pv)]" />
              <span>Tempo Solax (z pomiarów inwertera)</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              Suma z {daysWithData} dni rozliczonych przez Edge Function na
              bazie odczytów inwertera. Optymistyczne — Solax zaniża pobór
              prądu z sieci, więc bilans wychodzi większy niż realny.
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {formatPln(solaxNet)}
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--savings)]" />
              <span>Tempo realne (z faktur PGE)</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              Hipotetyczny koszt energii bez fotowoltaiki (na bazie zużycia
              rodziny 2015-2022, śr.{" "}
              {formatNumber(avgPrePvKwhYearly, 0)} kWh/rok) minus to co
              faktycznie zapłaciliśmy PGE w {pgeMonthsCounted} miesiącach
              po montażu, plus depozyt z eksportu. Najbliższe prawdy.
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {formatPln(pgeActualSavings)}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* === Breakdown — visible descriptions per Michał === */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiTile
          icon={Sun}
          label="Łączna produkcja"
          value={formatKwh(solaxYield, 1)}
          sub={`${daysWithData} dni z danymi`}
          description="Energia wyprodukowana przez panele od początku zbierania danych. Pełen lifetime z licznika inwertera ~17,7 MWh — różnica to dane sprzed Solax API (luty 2023 – marzec 2025)."
          tone="pv"
        />
        <KpiTile
          icon={Wallet}
          label="Autokonsumpcja"
          value={formatPln(solaxSavings)}
          sub="zużyte w domu od razu"
          description="Energia ze słońca zużyta natychmiast w domu × cena G11. Pieniądze które nie poszły do PGE — najwartościowszy strumień, bo cena zakupu jest 3-5× wyższa niż cena odkupu."
          tone="savings"
        />
        <KpiTile
          icon={ArrowUpFromLine}
          label="Eksport do sieci"
          value={formatPln(pgeDepositTotal)}
          sub={`${formatKwh(pgeExportKwhTotal, 0)} oddane do PGE`}
          description="Suma depozytu prosumenckiego z 37 faktur PGE (RCEm 2023, RCE 2024, ×1,23 od 02.2025). PGE odkłada to jako kredyt — odlicza od kolejnych faktur. Solax zaniża eksport, dlatego bierzemy z faktur."
          tone="export"
        />
        <KpiTile
          icon={Zap}
          label="Koszt poboru"
          value={formatPln(solaxCost)}
          sub="z taryfy G11"
          description="Energia pobrana z sieci wieczorem i nocą × pełna cena taryfy G11 brutto (~1,10 zł/kWh). To są pieniądze które realnie poszły do PGE za prąd zużyty po zachodzie słońca."
          tone="import"
        />
      </section>

      {/* === Break-even chart Tesla style + Avoided/Export donut === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <Card className="glass lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Próg rentowności — od CAPEX do zwrotu
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Krzywa zaczyna od −{(breakEvenTarget / 1000).toFixed(0)} 000 zł
              (koszt instalacji po dotacji Mój Prąd) i pnie się ku górze. Punkt
              przecięcia osi 0 = całkowity zwrot.
            </p>
          </CardHeader>
          <CardContent>
            <BreakEvenChart
              data={breakEvenCurve}
              installationCostPln={breakEvenTarget}
              subsidyPln={subsidy}
            />
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <span className="size-2 rounded-full bg-[var(--savings)] mt-1 shrink-0" />
                <div>
                  <div className="font-medium">Realny tempo (PGE)</div>
                  <div className="text-muted-foreground tabular-nums">
                    {formatPln(scenarios.real.annualRatePln)}/rok · próg{" "}
                    {scenarios.real.breakEvenYear !== Infinity
                      ? scenarios.real.breakEvenYear
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="size-2 rounded-full bg-[var(--pv)] mt-1 shrink-0" />
                <div>
                  <div className="font-medium">Solax tempo</div>
                  <div className="text-muted-foreground tabular-nums">
                    {formatPln(scenarios.solax.annualRatePln)}/rok · próg{" "}
                    {scenarios.solax.breakEvenYear !== Infinity
                      ? scenarios.solax.breakEvenYear
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Donut: Avoided Costs vs Export Revenues */}
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Skąd te pieniądze
              <InfoHint>
                Autokonsumpcja = energia ze słońca zużyta od razu w domu
                (pieniądze które nie poszły do PGE). Eksport = nadwyżka
                wysłana do sieci, rozliczana po RCEm/RCE w net-billingu.
                Autokonsumpcja jest zwykle 5-10× wartościowsza niż eksport.
              </InfoHint>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AvoidedExportDonut
              avoidedPln={solaxSavings}
              exportPln={pgeDepositTotal}
              size={160}
            />
          </CardContent>
        </Card>
      </div>

      {/* === Wyjaśnienie tempa: Solax vs Realny === */}
      <Card className="glass mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Czym się różnią dwa scenariusze tempa?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 px-4 py-3 rounded-xl bg-[var(--savings)]/8 border border-[var(--savings)]/20">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="size-2 rounded-full bg-[var(--savings)]" />
                <span className="font-semibold">Realny tempo (PGE)</span>
              </div>
              <p className="text-muted-foreground text-xs">
                Liczone z 37 zwalidowanych faktur PGE × historyczne ceny G11.
                Bierze hipotetyczny koszt życia bez PV (na bazie zużycia
                rodziny 2015-2022) minus to co faktycznie zapłaciliście PGE
                po montażu, plus depozyty z eksportu. To pieniądze które
                fizycznie nie poszły do PGE — najbliższe prawdy.
              </p>
            </div>
            <div className="flex-1 px-4 py-3 rounded-xl bg-[var(--pv)]/8 border border-[var(--pv)]/20">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="size-2 rounded-full bg-[var(--pv)]" />
                <span className="font-semibold">Solax tempo</span>
              </div>
              <p className="text-muted-foreground text-xs">
                Liczone z bieżących pomiarów inwertera (daily_aggregates).
                Solax raportuje import z sieci zaniżony (~89× mniej niż
                faktura PGE), więc bilans wychodzi optymistycznie. Pokazuje
                "ile teoretycznie powinno być" — ale realnie dom kupuje więcej
                prądu z sieci niż Solax to widzi.
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Dlaczego oba? Solax pomaga zrozumieć potencjał instalacji, realny
            pokazuje faktyczne pieniądze. Zwykle prawda jest gdzieś pomiędzy,
            bliżej Realnego.
          </p>
        </CardContent>
      </Card>

      {/* === Long-term forecast (Tesla style) — what if to 2050? === */}
      <Card className="glass mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Prognoza długoterminowa do 2050
          </CardTitle>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            Co by było gdyby instalacja pracowała 25 lat dalej? Trzy
            scenariusze: <strong className="text-foreground">bez wzrostu cen</strong> (linijka),
            ceny rosną o <strong className="text-foreground">5%/rok</strong> (typowo 2010-2020 w Polsce)
            albo <strong className="text-foreground">10%/rok</strong> (jak ostatnio 2022-2024).
            Uwzględnia spadek wydajności paneli ~0,5%/rok (degradacja).
          </p>
        </CardHeader>
        <CardContent>
          <LongTermForecastChart data={longTermForecast} />
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            {[2030, 2040, 2050].map((year) => {
              const point = longTermForecast.find(
                (p) => p.yearLabel === String(year),
              );
              if (!point) return null;
              return (
                <div
                  key={year}
                  className="px-3 py-2 rounded-lg bg-white/40"
                >
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
                    Do {year}
                  </div>
                  <div className="flex items-center justify-between gap-2 tabular-nums">
                    <span className="text-muted-foreground">+0%/rok</span>
                    <strong>{formatPln(point.noPriceGrowth)}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-2 tabular-nums">
                    <span className="text-muted-foreground">+5%/rok</span>
                    <strong className="text-[var(--grid-export)]">
                      {formatPln(point.moderate)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-2 tabular-nums">
                    <span className="text-muted-foreground">+10%/rok</span>
                    <strong className="text-[var(--savings-foreground)]">
                      {formatPln(point.high)}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-snug">
            Prognoza zaczyna od bieżącego tempa{" "}
            <strong>{formatPln(scenarios.real.annualRatePln)}/rok</strong> (z
            ostatnich 12 mies. faktur PGE) i pomnaża rok-rok przez założony
            wzrost cen. To NIE jest gwarancja — ceny energii mogą iść w
            dowolnym kierunku, ale daje skalę „dlaczego warto było zrobić".
          </p>
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

function BreakdownRow({
  sign,
  label,
  value,
  note,
  tone,
}: {
  sign: "+" | "−";
  label: string;
  value: string;
  note: string;
  tone: "savings" | "export" | "import";
}) {
  const dot =
    tone === "savings"
      ? "bg-[var(--savings)]"
      : tone === "export"
        ? "bg-[var(--grid-export)]"
        : "bg-[var(--grid-import)]";
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <span className="text-base font-semibold tabular-nums w-4 shrink-0">
          {sign}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`size-1.5 rounded-full shrink-0 ${dot}`} />
            <span className="font-medium">{label}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug ml-3.5">
            {note}
          </p>
        </div>
      </div>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
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
