import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/header";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import {
  YearlyGroupedChart,
  type YearlyMonthPoint,
} from "@/components/charts/yearly-grouped-chart";
import { Sun, TrendingUp, Calendar, Sparkles, ArrowUpFromLine } from "lucide-react";
import {
  getActiveInverter,
  getMonthlyAggregates,
  getHistoricalPgeInvoices,
} from "@/lib/data/queries";
import { PL_MONTH_SHORT, todayWarsaw } from "@/lib/date";
import { formatKwh, formatMonthYear, formatMwh, formatPln } from "@/lib/format";
import { GLOSSARY } from "@/lib/copy/glossary";

export const metadata = { title: "Rok do roku" };
export const dynamic = "force-dynamic";

function isValidYear(s: string | undefined): s is string {
  return !!s && /^\d{4}$/.test(s);
}

export default async function YearlyPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const filterYear = isValidYear(params.year) ? params.year : null;

  const inverter = await getActiveInverter();
  if (!inverter) {
    return (
      <>
        <DashboardHeader title="Rok do roku" recordedAt={null} />
        <Card className="glass">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Brak instalacji w bazie.
          </CardContent>
        </Card>
      </>
    );
  }

  const [monthlySolax, pgeInvoices] = await Promise.all([
    getMonthlyAggregates(inverter.id),
    getHistoricalPgeInvoices(inverter.id),
  ]);

  // Two parallel data sources by year-month:
  //   Solax: pv_generation_kwh (only ~last 13 months)
  //   PGE:   grid_export_kwh + grid_import_kwh + deposit_value_pln (37 months)
  const pvByYearMonth = new Map<string, number>();
  for (const m of monthlySolax) {
    pvByYearMonth.set(String(m.month).slice(0, 7), Number(m.pv_generation_kwh ?? 0));
  }

  const exportByYearMonth = new Map<string, number>();
  const importByYearMonth = new Map<string, number>();
  const depositByYearMonth = new Map<string, number>();
  for (const inv of pgeInvoices) {
    const ym = inv.month_date.slice(0, 7);
    exportByYearMonth.set(ym, Number(inv.grid_export_kwh));
    importByYearMonth.set(ym, Number(inv.grid_import_kwh));
    depositByYearMonth.set(ym, Number(inv.deposit_value_pln));
  }

  // Years present in either source
  const yearsSet = new Set<number>();
  for (const ym of pvByYearMonth.keys()) yearsSet.add(Number(ym.slice(0, 4)));
  for (const ym of exportByYearMonth.keys()) yearsSet.add(Number(ym.slice(0, 4)));
  const years = Array.from(yearsSet).sort();

  // Chart 1: PV production where we have it, otherwise use export as a proxy
  // (export ≤ pv_generation, but it's the only number we have for 2023/2024)
  const productionData: YearlyMonthPoint[] = Array.from({ length: 12 }, (_, idx) => {
    const monthIdx = idx + 1;
    const monthStr = String(monthIdx).padStart(2, "0");
    const row: YearlyMonthPoint = {
      monthIdx,
      monthLabel: PL_MONTH_SHORT[idx],
    };
    for (const year of years) {
      const ym = `${year}-${monthStr}`;
      const pv = pvByYearMonth.get(ym);
      const exp = exportByYearMonth.get(ym);
      // Prefer PV when available, fall back to export
      row[String(year)] = pv != null && pv > 0 ? pv : (exp ?? 0);
    }
    return row;
  });

  // Year-level rollups
  const yearTotals = new Map<
    number,
    {
      pv_kwh: number;
      pv_source: "solax" | "missing";
      export_kwh: number;
      import_kwh: number;
      deposit_pln: number;
    }
  >();

  for (const year of years) {
    let pv = 0;
    let pvCount = 0;
    let exp = 0;
    let imp = 0;
    let dep = 0;
    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2, "0")}`;
      const pvVal = pvByYearMonth.get(ym);
      if (pvVal != null && pvVal > 0) {
        pv += pvVal;
        pvCount++;
      }
      exp += exportByYearMonth.get(ym) ?? 0;
      imp += importByYearMonth.get(ym) ?? 0;
      dep += depositByYearMonth.get(ym) ?? 0;
    }
    yearTotals.set(year, {
      pv_kwh: pv,
      pv_source: pvCount > 0 ? "solax" : "missing",
      export_kwh: exp,
      import_kwh: imp,
      deposit_pln: dep,
    });
  }

  const todayYear = Number(todayWarsaw().slice(0, 4));
  const todayMonth = Number(todayWarsaw().slice(5, 7));
  const previousYear = todayYear - 1;
  const currentYear = yearTotals.get(todayYear);
  const lastYear = yearTotals.get(previousYear);

  // Same-period YOY comparison (audit A.5 fix).
  // Was: for i=1..todayMonth — compared current YTD to last-year-YTD using
  // todayMonth as the ceiling, but we don't always have data through
  // todayMonth (PGE invoices arrive months later). Result was -97% noise
  // in early year when current year had 1 day vs previous full 5 months.
  //
  // Now: find the LAST month for which we have data in BOTH years
  // (current and previous), and compare jan..thatMonth in both. Plus require
  // ≥2 months of data to call YOY meaningful.
  let lastSharedMonth = 0;
  for (let i = 1; i <= todayMonth; i++) {
    const mm = String(i).padStart(2, "0");
    const cyHas = exportByYearMonth.has(`${todayYear}-${mm}`);
    const pyHas = exportByYearMonth.has(`${previousYear}-${mm}`);
    if (cyHas && pyHas) lastSharedMonth = i;
  }

  let cySamePeriod = 0;
  let pySamePeriod = 0;
  for (let i = 1; i <= lastSharedMonth; i++) {
    const mm = String(i).padStart(2, "0");
    cySamePeriod += exportByYearMonth.get(`${todayYear}-${mm}`) ?? 0;
    pySamePeriod += exportByYearMonth.get(`${previousYear}-${mm}`) ?? 0;
  }

  // Disable YOY badge when we don't have enough comparable data
  const yoyMeaningful = lastSharedMonth >= 2 && pySamePeriod > 0;
  const yoyDelta = yoyMeaningful
    ? ((cySamePeriod - pySamePeriod) / pySamePeriod) * 100
    : null;
  const yoyPeriodLabel =
    lastSharedMonth > 0
      ? `1.${String(1).padStart(2, "0")} → ${PL_MONTH_SHORT[lastSharedMonth - 1].toLowerCase()}`
      : null;

  // Best month overall by export
  let bestMonth: { ym: string; kwh: number } | null = null;
  for (const [ym, kwh] of exportByYearMonth) {
    if (!bestMonth || kwh > bestMonth.kwh) bestMonth = { ym, kwh };
  }

  // Lifetime total
  const lifetimePvKwh = Array.from(yearTotals.values()).reduce(
    (s, y) => s + y.pv_kwh,
    0,
  );
  const lifetimeExportKwh = Array.from(yearTotals.values()).reduce(
    (s, y) => s + y.export_kwh,
    0,
  );

  // Contextual comment
  const commentary = buildYearlyCommentary({
    todayYear,
    todayMonth,
    yearTotals,
    yoyDelta,
    cySamePeriod,
    pySamePeriod,
  });

  return (
    <>
      <DashboardHeader
        title={filterYear ? `Rok ${filterYear}` : "Rok do roku"}
        recordedAt={null}
      />

      {/* === Year filter pills === */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <a
          href="/yearly"
          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
            !filterYear
              ? "bg-[var(--pv)]/20 text-foreground font-semibold"
              : "bg-white/40 hover:bg-white/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          Wszystkie lata
        </a>
        {years.slice().reverse().map((year) => (
          <a
            key={year}
            href={`/yearly?year=${year}`}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filterYear === String(year)
                ? "bg-[var(--pv)]/20 text-foreground font-semibold"
                : "bg-white/40 hover:bg-white/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {year}
          </a>
        ))}
      </div>

      {/* === Single-year drill-down (when filter active) === */}
      {filterYear && (
        <SingleYearDrilldown
          year={filterYear}
          pgeInvoices={pgeInvoices}
          pvByYearMonth={pvByYearMonth}
          yearTotals={yearTotals}
        />
      )}

      {commentary && !filterYear && (
        <Card className="glass mb-4">
          <CardContent className="py-4 px-5 sm:px-6 text-sm leading-relaxed">
            {commentary}
          </CardContent>
        </Card>
      )}

      <Card className="glass mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Produkcja vs eksport miesięczny · porównanie lat
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Dla 2025/2026 — produkcja PV z Solax. Dla 2023/2024 — eksport do
            sieci z faktur PGE (Solax API udostępnia dane tylko ostatnich ~13
            mies.).
          </p>
        </CardHeader>
        <CardContent>
          <YearlyGroupedChart data={productionData} years={years} />
        </CardContent>
      </Card>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiTile
          icon={Sun}
          label={`Bieżący rok (${todayYear})`}
          value={
            currentYear?.pv_source === "solax"
              ? formatKwh(currentYear.pv_kwh, 1)
              : currentYear
                ? formatKwh(currentYear.export_kwh, 1)
                : "—"
          }
          sub={
            currentYear?.pv_source === "solax"
              ? `Produkcja do końca ${PL_MONTH_SHORT[todayMonth - 1].toLowerCase()}`
              : `Eksport (z faktur PGE)`
          }
          tone="pv"
          hint={GLOSSARY.produkcjaLifetime}
        />
        <KpiTile
          icon={Calendar}
          label={`Poprzedni rok (${previousYear})`}
          value={
            lastYear?.pv_source === "solax"
              ? formatKwh(lastYear.pv_kwh, 1)
              : lastYear
                ? formatKwh(lastYear.export_kwh, 1)
                : "—"
          }
          sub={
            lastYear?.pv_source === "solax"
              ? "Produkcja całość roku"
              : lastYear
                ? "Eksport (z faktur PGE)"
                : "brak danych"
          }
          tone="export"
        />
        <KpiTile
          icon={TrendingUp}
          label="YoY (eksport, ten sam okres)"
          value={
            yoyDelta != null
              ? `${yoyDelta >= 0 ? "+" : ""}${yoyDelta.toFixed(0)}%`
              : "Za mało danych"
          }
          sub={
            yoyDelta != null
              ? `${formatKwh(cySamePeriod, 0)} vs ${formatKwh(pySamePeriod, 0)} · ${yoyPeriodLabel ?? ""}`
              : "Wiarygodne YoY po pierwszym pełnym kwartale"
          }
          description={
            yoyDelta != null
              ? `Porównujemy eksport do sieci w okresie ${yoyPeriodLabel} bieżącego roku vs ten sam okres rok temu (${lastSharedMonth} ${lastSharedMonth === 1 ? "miesiąc" : lastSharedMonth < 5 ? "miesiące" : "miesięcy"} z fakturami PGE w obu latach).`
              : "Czekamy na faktury PGE pokrywające co najmniej 2 miesiące bieżącego roku — wtedy YoY ma sens."
          }
          tone={yoyDelta != null && yoyDelta >= 0 ? "savings" : "import"}
        />
        <KpiTile
          icon={Sparkles}
          label="Najlepszy miesiąc (eksport)"
          value={bestMonth ? formatKwh(bestMonth.kwh, 0) : "—"}
          sub={bestMonth ? formatYM(bestMonth.ym) : undefined}
          tone="pv"
          hint={GLOSSARY.najlepszyMiesiac}
        />
      </section>

      {/* Per-year breakdown table */}
      <Card className="glass mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Roczne sumy z faktur PGE
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground border-b border-zinc-200/60">
                  <th className="px-5 sm:px-3 py-2 font-medium">Rok</th>
                  <th className="px-3 py-2 font-medium text-right">Produkcja PV</th>
                  <th className="px-3 py-2 font-medium text-right">Eksport</th>
                  <th className="px-3 py-2 font-medium text-right">Pobór</th>
                  <th className="px-5 sm:px-3 py-2 font-medium text-right">Depozyt</th>
                </tr>
              </thead>
              <tbody>
                {years.slice().reverse().map((year) => {
                  const t = yearTotals.get(year);
                  if (!t) return null;
                  return (
                    <tr key={year} className="border-b border-zinc-100/60 hover:bg-white/30">
                      <td className="px-5 sm:px-3 py-2 font-medium">{year}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {t.pv_source === "solax"
                          ? formatKwh(t.pv_kwh, 0)
                          : <span className="text-muted-foreground">brak (Solax tylko ~13 mies.)</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatKwh(t.export_kwh, 0)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatKwh(t.import_kwh, 0)}
                      </td>
                      <td className="px-5 sm:px-3 py-2 text-right tabular-nums">
                        {formatPln(t.deposit_pln)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">
            Sumaryczna produkcja w bazie
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Solax + PGE eksport
          </span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tabular-nums">
            {formatMwh(lifetimePvKwh)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Produkcja PV (Solax API). Plus {formatMwh(lifetimeExportKwh)} eksportu
            do sieci według faktur PGE (37 miesięcy 02.2023 → 02.2026). Pełen
            lifetime z licznika falownika ~17,7 MWh — różnica to autokonsumpcja
            przed siecią plus brakujące miesiące w danych.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

function formatYM(ym: string): string {
  const [y, m] = ym.split("-");
  const monthName = PL_MONTH_SHORT[Number(m) - 1] ?? m;
  return `${monthName} ${y}`;
}

type YearTotals = Map<number, {
  pv_kwh: number;
  pv_source: "solax" | "missing";
  export_kwh: number;
  import_kwh: number;
  deposit_pln: number;
}>;

function buildYearlyCommentary(args: {
  todayYear: number;
  todayMonth: number;
  yearTotals: YearTotals;
  yoyDelta: number | null;
  cySamePeriod: number;
  pySamePeriod: number;
}): string | null {
  const { todayYear, yearTotals, yoyDelta } = args;
  const lines: string[] = [];

  // Best year by export
  let bestYear: number | null = null;
  let bestExport = 0;
  for (const [year, t] of yearTotals) {
    // Skip current year — partial
    if (year === todayYear) continue;
    if (t.export_kwh > bestExport) {
      bestExport = t.export_kwh;
      bestYear = year;
    }
  }
  if (bestYear) {
    lines.push(
      `Najlepszy pełny rok pod względem eksportu: ${bestYear} z ${formatKwh(bestExport, 0)}.`,
    );
  }

  // YoY tone for current year
  if (yoyDelta != null) {
    if (yoyDelta > 5) {
      lines.push(
        `Bieżący rok rozkręca się szybciej niż rok temu (+${yoyDelta.toFixed(0)}%) — głównie przez słoneczniejszy okres albo mniejsze zużycie domu.`,
      );
    } else if (yoyDelta < -5) {
      lines.push(
        `Bieżący rok jest słabszy niż rok temu (${yoyDelta.toFixed(0)}%) — pochmurny okres albo wyższe zużycie domu.`,
      );
    } else {
      lines.push(`Bieżący rok jest porównywalny z poprzednim (${yoyDelta >= 0 ? "+" : ""}${yoyDelta.toFixed(0)}%).`);
    }
  }

  return lines.length > 0 ? lines.join(" ") : null;
}

function SingleYearDrilldown({
  year,
  pgeInvoices,
  pvByYearMonth,
  yearTotals,
}: {
  year: string;
  pgeInvoices: import("@/lib/data/types").HistoricalPgeInvoice[];
  pvByYearMonth: Map<string, number>;
  yearTotals: Map<
    number,
    {
      pv_kwh: number;
      pv_source: "solax" | "missing";
      export_kwh: number;
      import_kwh: number;
      deposit_pln: number;
    }
  >;
}) {
  const t = yearTotals.get(Number(year));
  const monthsThisYear = pgeInvoices
    .filter((i) => i.month_date.startsWith(year))
    .sort((a, b) => a.month_date.localeCompare(b.month_date));

  return (
    <Card className="glass mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Drążenie w rok {year}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Per-miesiąc dane z faktur PGE plus produkcja PV gdzie Solax ma
          historię (od 04.2025).
        </p>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        {t && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 sm:px-0 mb-4 text-sm">
            <Stat label="Produkcja PV" value={t.pv_source === "solax" ? formatKwh(t.pv_kwh, 0) : "brak"} />
            <Stat label="Eksport" value={formatKwh(t.export_kwh, 0)} />
            <Stat label="Pobór" value={formatKwh(t.import_kwh, 0)} />
            <Stat label="Depozyt" value={formatPln(t.deposit_pln)} />
          </div>
        )}
        <div className="overflow-x-auto -mx-5 sm:mx-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground border-b border-zinc-200/60">
                <th className="px-5 sm:px-3 py-2 font-medium">Miesiąc</th>
                <th className="px-3 py-2 font-medium text-right">PV produkcja</th>
                <th className="px-3 py-2 font-medium text-right">Eksport</th>
                <th className="px-3 py-2 font-medium text-right">Pobór</th>
                <th className="px-5 sm:px-3 py-2 font-medium text-right">Depozyt</th>
              </tr>
            </thead>
            <tbody>
              {monthsThisYear.map((row) => {
                const pv = pvByYearMonth.get(row.month_date.slice(0, 7));
                return (
                  <tr key={row.month_date} className="border-b border-zinc-100/60 hover:bg-white/30">
                    <td className="px-5 sm:px-3 py-2">
                      <a
                        href={`/monthly?month=${row.month_date.slice(0, 7)}`}
                        className="hover:underline"
                      >
                        {formatMonthYear(row.month_date)}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {pv != null && pv > 0 ? formatKwh(pv, 0) : <span className="text-muted-foreground">brak</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatKwh(row.grid_export_kwh, 0)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatKwh(row.grid_import_kwh, 0)}
                    </td>
                    <td className="px-5 sm:px-3 py-2 text-right tabular-nums">
                      {formatPln(row.deposit_value_pln)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
