import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/header";
import { DateNav } from "@/components/dashboard/date-nav";
import { MonthPicker, type MonthOption } from "@/components/dashboard/month-picker";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import {
  MonthlyBarChart,
  type MonthlyDayPoint,
} from "@/components/charts/monthly-bar-chart";
import { Sun, Wallet, TrendingUp, CalendarCheck, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import {
  getActiveInverter,
  getDailyAggregates,
  getHistoricalPgeInvoices,
} from "@/lib/data/queries";
import {
  todayWarsaw,
  shiftMonthString,
  firstOfMonth,
  lastOfMonth,
  PL_MONTH_SHORT,
} from "@/lib/date";
import { formatKwh, formatMonthYear, formatPln, formatDateShort } from "@/lib/format";
import { GLOSSARY } from "@/lib/copy/glossary";
import { Card as CardK, CardContent as CardContentK } from "@/components/ui/card";
import { narrateMonth } from "@/lib/derive/period-narrator";
import { PeriodNarrative } from "@/components/dashboard/period-narrative";

export const metadata = { title: "Miesiąc" };
export const dynamic = "force-dynamic";

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const today = todayWarsaw();
  const currentMonth = today.slice(0, 7);
  const month = isValidYearMonth(params.month) ? params.month! : currentMonth;

  const inverter = await getActiveInverter();
  if (!inverter) {
    return (
      <>
        <DashboardHeader title="Miesiąc" recordedAt={null} />
        <Card className="glass">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Brak instalacji w bazie.
          </CardContent>
        </Card>
      </>
    );
  }

  const fromDate = firstOfMonth(`${month}-01`);
  const toDate = lastOfMonth(`${month}-01`);

  const [dailyRange, allInvoices] = await Promise.all([
    getDailyAggregates(inverter.id, fromDate, toDate),
    getHistoricalPgeInvoices(inverter.id),
  ]);

  // Match the PGE invoice for this month (if any)
  const pgeRow = allInvoices.find((i) => i.month_date.startsWith(month));

  // Determine data source for this month
  // - Solax daily aggregates if available (post-2025-04 typically)
  // - PGE invoice fallback for older months
  const hasSolaxDaily = dailyRange.length > 0;
  const hasPgeInvoice = !!pgeRow;

  // Build full month chart data
  const totalDaysInMonth = Number(toDate.slice(8));
  const byDate = new Map(dailyRange.map((d) => [d.date, d]));
  const data: MonthlyDayPoint[] = Array.from(
    { length: totalDaysInMonth },
    (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      const date = `${month}-${day}`;
      const row = byDate.get(date);
      return {
        date,
        dayLabel: String(i + 1),
        yield_kwh: Number(row?.yield_kwh ?? 0),
        savings_pln: Number(row?.savings_pln ?? 0),
      };
    },
  );

  // Aggregates: prefer Solax for production stats, PGE for grid stats
  const totalYield = data.reduce((s, d) => s + d.yield_kwh, 0);
  const totalSavings = dailyRange.reduce(
    (s, d) =>
      s +
      Number(d.savings_pln ?? 0) +
      Number(d.earnings_pln ?? 0) -
      Number(d.cost_pln ?? 0),
    0,
  );
  const daysWithData = dailyRange.length;
  const avgDaily = daysWithData > 0 ? totalYield / daysWithData : 0;
  const top3 = [...dailyRange]
    .sort((a, b) => Number(b.yield_kwh ?? 0) - Number(a.yield_kwh ?? 0))
    .slice(0, 3);

  // Build month picker options — include every month with PGE data
  const monthsWithData = new Set(allInvoices.map((i) => i.month_date.slice(0, 7)));
  // Plus current month even if no invoice yet
  monthsWithData.add(currentMonth);
  // Plus any month with daily aggregates (e.g. 2025-04 onwards from Solax)
  for (const d of dailyRange) monthsWithData.add(d.date.slice(0, 7));

  const monthOptions: MonthOption[] = generateMonthRange(
    minMonth(monthsWithData) ?? "2023-02",
    currentMonth,
  ).map((ym) => ({
    value: ym,
    label: monthLabel(ym),
    hasData: monthsWithData.has(ym),
  })).reverse(); // newest first

  const prevMonth = shiftMonthString(month, -1);
  const nextMonth = shiftMonthString(month, +1);
  const canGoForward = nextMonth <= currentMonth;

  // Contextual rules-based commentary (legacy, used for PGE-only fallback months).
  const commentary = buildMonthlyCommentary({
    month,
    totalYield,
    avgDaily,
    pgeRow: pgeRow ?? null,
    allInvoices,
    hasSolaxDaily,
    hasPgeInvoice,
  });

  // Liczby do narratora (Solax-driven days)
  const totalCost = dailyRange.reduce((s, d) => s + Number(d.cost_pln ?? 0), 0);
  const totalRevenue = dailyRange.reduce(
    (s, d) =>
      s + Number(d.savings_pln ?? 0) + Number(d.earnings_pln ?? 0),
    0,
  );
  const bestDayRow = dailyRange.reduce<{ kwh: number; date: string | null }>(
    (acc, d) => {
      const k = Number(d.yield_kwh ?? 0);
      if (k > acc.kwh) return { kwh: k, date: d.date };
      return acc;
    },
    { kwh: 0, date: null },
  );
  const selfUseAvg = (() => {
    const valid = dailyRange.filter((d) => d.self_use_rate_pct != null);
    if (valid.length === 0) return null;
    return (
      valid.reduce((s, d) => s + Number(d.self_use_rate_pct ?? 0), 0) /
      valid.length
    );
  })();

  // Same month last year for YoY narration (Solax-only — old months may be PGE-only)
  const sameMonthLastYearKwh = (() => {
    const [y, m] = month.split("-").map(Number);
    const target = `${y - 1}-${String(m).padStart(2, "0")}`;
    const inv = allInvoices.find((i) => i.month_date.startsWith(target));
    if (inv && inv.grid_export_kwh != null) {
      // For old months only PGE export is available — convert to approx production
      // Production ≈ export + self-use; we don't have self-use historic. Use grid_export only as lower bound.
      // Better: skip if no daily data available historically.
      return null; // conservative — don't lie if we don't have the right metric
    }
    return null;
  })();

  const monthNarration = hasSolaxDaily
    ? narrateMonth({
        monthDate: `${month}-01`,
        todayWarsaw: today,
        yieldKwh: totalYield,
        savingsPln: totalRevenue,
        costPln: totalCost,
        balancePln: totalSavings,
        daysWithData,
        bestDayKwh: bestDayRow.kwh > 0 ? bestDayRow.kwh : null,
        bestDayDate: bestDayRow.date,
        selfUsePct: selfUseAvg,
        sameMonthLastYearKwh,
      })
    : null;

  return (
    <>
      <DashboardHeader title={formatMonthYear(`${month}-01`)} recordedAt={null} />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <DateNav
          basePath="/monthly"
          prevHref={`/monthly?month=${prevMonth}`}
          nextHref={canGoForward ? `/monthly?month=${nextMonth}` : null}
          current={formatMonthYear(`${month}-01`)}
        />
        <MonthPicker current={month} options={monthOptions} basePath="/monthly" />
        {month !== currentMonth && (
          <a
            href={`/monthly?month=${currentMonth}`}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Bieżący miesiąc
          </a>
        )}
      </div>

      {monthNarration ? (
        <PeriodNarrative narration={monthNarration} className="mb-4" />
      ) : commentary ? (
        <Card className="glass mb-4">
          <CardContent className="py-4 px-5 sm:px-6 text-sm leading-relaxed">
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium block mb-1">
              Co się działo w tym miesiącu
            </span>
            {commentary}
          </CardContent>
        </Card>
      ) : null}

      {/* === Kluczowe wskaźniki: YoY + best/worst months in current year === */}
      <KeyIndicators
        month={month}
        currentYear={today.slice(0, 4)}
        allInvoices={allInvoices}
      />

      {hasSolaxDaily ? (
        <Card className="glass mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Produkcja dzienna · {formatMonthYear(`${month}-01`)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyBarChart data={data} />
          </CardContent>
        </Card>
      ) : (
        <EmptyMonthState
          month={month}
          today={today}
          currentMonth={currentMonth}
          hasPgeData={hasPgeInvoice}
        />
      )}

      {/* PGE-source KPI tiles for old months, Solax for fresh */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {hasSolaxDaily ? (
          <>
            <KpiTile
              icon={Sun}
              label="Produkcja w miesiącu"
              value={formatKwh(totalYield)}
              sub={`${daysWithData} dni z danymi`}
              tone="pv"
              hint={GLOSSARY.produkcjaLifetime}
            />
            <KpiTile
              icon={TrendingUp}
              label="Średnia dzienna"
              value={formatKwh(avgDaily)}
              sub="z dni z danymi"
              tone="pv"
              hint={GLOSSARY.sredniaDzienna}
            />
          </>
        ) : (
          <>
            <KpiTile
              icon={Sun}
              label="Produkcja w miesiącu"
              value="—"
              sub="brak danych Solax"
              tone="neutral"
            />
            <KpiTile
              icon={TrendingUp}
              label="Średnia dzienna"
              value="—"
              sub="brak danych Solax"
              tone="neutral"
            />
          </>
        )}
        {hasPgeInvoice ? (
          <>
            <KpiTile
              icon={ArrowDownToLine}
              label="Pobór z sieci"
              value={formatKwh(pgeRow.grid_import_kwh, 0)}
              sub={pgeRow.invoice_no ? `Faktura ${pgeRow.invoice_no}` : "Z faktury PGE"}
              tone="import"
              hint={GLOSSARY.importPobor}
            />
            <KpiTile
              icon={ArrowUpFromLine}
              label="Eksport do sieci"
              value={formatKwh(pgeRow.grid_export_kwh, 0)}
              sub={`Depozyt ${formatPln(pgeRow.deposit_value_pln)}`}
              tone="export"
              hint={GLOSSARY.eksport}
            />
          </>
        ) : (
          <>
            <KpiTile
              icon={Wallet}
              label="Bilans finansowy"
              value={formatPln(totalSavings)}
              sub="oszczędności + eksport − pobór"
              tone="savings"
              hint={GLOSSARY.bilansFinansowyMiesiaca}
            />
            <KpiTile
              icon={CalendarCheck}
              label="Najlepszy dzień"
              value={top3[0] ? formatKwh(top3[0].yield_kwh) : "—"}
              sub={top3[0] ? formatDateShort(top3[0].date) : undefined}
              tone="pv"
              hint={GLOSSARY.najlepszyDzien}
            />
          </>
        )}
      </section>

      {/* For fresh months with Solax data, also show top 3 days */}
      {hasSolaxDaily && top3.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Top dni produkcji</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2 text-sm">
              {top3.map((d, idx) => (
                <li key={d.date} className="flex items-center justify-between gap-3 py-1">
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="size-6 rounded-full bg-[var(--pv)]/15 text-[var(--pv-foreground)] text-xs font-medium flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate">{formatDateShort(d.date)}</span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatKwh(d.yield_kwh)}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function isValidYearMonth(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}$/.test(s);
}

function generateMonthRange(fromYM: string, toYM: string): string[] {
  const result: string[] = [];
  let cur = fromYM;
  while (cur <= toYM) {
    result.push(cur);
    cur = shiftMonthString(cur, 1);
  }
  return result;
}

function minMonth(set: Set<string>): string | null {
  let min: string | null = null;
  for (const m of set) {
    if (min === null || m < min) min = m;
  }
  return min;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const idx = Number(m) - 1;
  return `${PL_MONTH_SHORT[idx]} ${y}`;
}

type CommentaryArgs = {
  month: string;
  totalYield: number;
  avgDaily: number;
  pgeRow: import("@/lib/data/types").HistoricalPgeInvoice | null;
  allInvoices: import("@/lib/data/types").HistoricalPgeInvoice[];
  hasSolaxDaily: boolean;
  hasPgeInvoice: boolean;
};

function buildMonthlyCommentary(args: CommentaryArgs): string | null {
  const { month, totalYield, pgeRow, allInvoices, hasSolaxDaily } = args;
  const lines: string[] = [];

  // YoY same-month comparison from PGE invoices
  if (pgeRow) {
    const [y, m] = month.split("-");
    const prevYearMonth = `${Number(y) - 1}-${m}`;
    const prevYearRow = allInvoices.find((i) => i.month_date.startsWith(prevYearMonth));
    if (prevYearRow && Number(prevYearRow.grid_export_kwh) > 0) {
      const delta =
        ((Number(pgeRow.grid_export_kwh) - Number(prevYearRow.grid_export_kwh)) /
          Number(prevYearRow.grid_export_kwh)) *
        100;
      const sign = delta >= 0 ? "+" : "";
      lines.push(
        `Eksport do sieci: ${formatKwh(pgeRow.grid_export_kwh, 0)} — ${sign}${delta.toFixed(0)}% vs ten sam miesiąc rok temu (${formatKwh(prevYearRow.grid_export_kwh, 0)}).`,
      );
    } else {
      lines.push(
        `Eksport do sieci: ${formatKwh(pgeRow.grid_export_kwh, 0)}, depozyt ${formatPln(pgeRow.deposit_value_pln)}.`,
      );
    }
  }

  // Production context (only if Solax data)
  if (hasSolaxDaily && totalYield > 0) {
    // Compare to all-time best month
    const allMonthsExports = allInvoices
      .filter((i) => i.grid_export_kwh != null)
      .sort((a, b) => Number(b.grid_export_kwh) - Number(a.grid_export_kwh));
    if (allMonthsExports.length > 0) {
      const best = allMonthsExports[0];
      const bestKwh = Number(best.grid_export_kwh);
      const ratio = (Number(pgeRow?.grid_export_kwh ?? 0) / bestKwh) * 100;
      if (pgeRow && bestKwh > 0 && ratio > 0) {
        lines.push(
          `${ratio.toFixed(0)}% eksportu rekordowego miesiąca (${formatMonthYear(best.month_date)} z ${formatKwh(bestKwh, 0)}).`,
        );
      }
    }
  }

  if (!hasSolaxDaily && pgeRow) {
    lines.push(
      `Solax udostępnia produkcję dzienną tylko z ostatnich ~13 mies. — dla starszych miesięcy pokazujemy dane sieciowe z faktur PGE.`,
    );
  }

  return lines.length > 0 ? lines.join(" ") : null;
}

function EmptyMonthState({
  month,
  today,
  currentMonth,
  hasPgeData,
}: {
  month: string;
  today: string;
  currentMonth: string;
  hasPgeData: boolean;
}) {
  const isCurrentMonth = month === currentMonth;
  const dayOfToday = Number(today.slice(8, 10));
  const isVeryEarlyInMonth = isCurrentMonth && dayOfToday <= 2;

  // Audit C.7 — three distinct empty states with appropriate CTAs
  if (isVeryEarlyInMonth) {
    return (
      <Card className="glass mb-4">
        <CardContent className="py-6 px-5 sm:px-6">
          <div className="flex flex-col gap-2 text-sm">
            <div className="font-medium">
              ⏳ Miesiąc dopiero się zaczął
            </div>
            <p className="text-muted-foreground">
              Pierwsze pełne dane miesięczne pojawią się dziś po zachodzie słońca,
              gdy Edge Function rozliczy daily aggregate. Sprawdź zakładkę{" "}
              <a href={`/daily?date=${today}`} className="underline hover:no-underline font-medium">
                Dziś
              </a>{" "}
              żeby zobaczyć produkcję na żywo, albo{" "}
              <a
                href={`/monthly?month=${shiftMonthString(currentMonth, -1)}`}
                className="underline hover:no-underline font-medium"
              >
                zeszły miesiąc
              </a>{" "}
              dla pełnego rozliczenia.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isCurrentMonth) {
    return (
      <Card className="glass mb-4">
        <CardContent className="py-6 px-5 sm:px-6 text-sm">
          <div className="font-medium mb-1">📅 Miesiąc w toku</div>
          <p className="text-muted-foreground">
            Daily aggregates się gromadzą — wykres rośnie z każdym dniem. Pełen
            obraz miesiąca będzie po jego końcu.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Historical month outside Solax 13-month window
  return (
    <Card className="glass mb-4">
      <CardContent className="py-6 px-5 sm:px-6 text-sm">
        <div className="font-medium mb-1">
          ℹ️ Brak danych dziennych Solax dla tego okresu
        </div>
        <p className="text-muted-foreground">
          Solax API udostępnia tylko ostatnie ~13 miesięcy danych dziennych.
          {hasPgeData ? (
            <>
              {" "}
              Dla tego miesiąca mamy dane sieciowe z faktur PGE — patrz kafelki
              poboru/eksportu poniżej.
            </>
          ) : (
            <>
              {" "}
              Dla tego miesiąca nie mamy też jeszcze faktury PGE.
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function KeyIndicators({
  month,
  currentYear,
  allInvoices,
}: {
  month: string;
  currentYear: string;
  allInvoices: import("@/lib/data/types").HistoricalPgeInvoice[];
}) {
  // Months in current calendar year with data
  const thisYearMonths = allInvoices
    .filter((i) => i.month_date.startsWith(currentYear))
    .sort((a, b) =>
      Number(b.grid_export_kwh) - Number(a.grid_export_kwh),
    );
  if (thisYearMonths.length === 0) return null;

  const best = thisYearMonths[0];
  const worst = thisYearMonths[thisYearMonths.length - 1];
  const avgExport =
    thisYearMonths.reduce((s, i) => s + Number(i.grid_export_kwh), 0) /
    thisYearMonths.length;
  const avgImport =
    thisYearMonths.reduce((s, i) => s + Number(i.grid_import_kwh), 0) /
    thisYearMonths.length;

  // Compare current month vs same month previous year
  const [y, m] = month.split("-");
  const prevYearKey = `${Number(y) - 1}-${m}`;
  const prevYearRow = allInvoices.find((i) =>
    i.month_date.startsWith(prevYearKey),
  );
  const currentRow = allInvoices.find((i) => i.month_date.startsWith(month));

  return (
    <CardK className="glass mb-4">
      <CardContentK className="px-5 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Kluczowe wskaźniki w roku {currentYear}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {thisYearMonths.length} mies. z danymi
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Najlepszy miesiąc
            </div>
            <div className="text-base font-semibold tabular-nums mt-0.5">
              {formatKwh(best.grid_export_kwh, 0)}
            </div>
            <div className="text-[11px] text-muted-foreground tabular-nums">
              {formatMonthYear(best.month_date)} · eksport
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Najsłabszy miesiąc
            </div>
            <div className="text-base font-semibold tabular-nums mt-0.5">
              {formatKwh(worst.grid_export_kwh, 0)}
            </div>
            <div className="text-[11px] text-muted-foreground tabular-nums">
              {formatMonthYear(worst.month_date)} · eksport
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Średni eksport/mies.
            </div>
            <div className="text-base font-semibold tabular-nums mt-0.5">
              {formatKwh(avgExport, 0)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              do sieci PGE
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Średni pobór/mies.
            </div>
            <div className="text-base font-semibold tabular-nums mt-0.5">
              {formatKwh(avgImport, 0)}
            </div>
            <div className="text-[11px] text-muted-foreground">z sieci PGE</div>
          </div>
        </div>

        {currentRow && prevYearRow && (
          <div className="mt-4 pt-3 border-t border-zinc-200/40 text-sm leading-relaxed">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium block mb-1">
              Porównanie z rokiem temu
            </span>
            <YoyComparison current={currentRow} previous={prevYearRow} />
          </div>
        )}
      </CardContentK>
    </CardK>
  );
}

function YoyComparison({
  current,
  previous,
}: {
  current: import("@/lib/data/types").HistoricalPgeInvoice;
  previous: import("@/lib/data/types").HistoricalPgeInvoice;
}) {
  const exportDelta =
    Number(previous.grid_export_kwh) > 0
      ? ((Number(current.grid_export_kwh) - Number(previous.grid_export_kwh)) /
          Number(previous.grid_export_kwh)) *
        100
      : 0;
  const importDelta =
    Number(previous.grid_import_kwh) > 0
      ? ((Number(current.grid_import_kwh) - Number(previous.grid_import_kwh)) /
          Number(previous.grid_import_kwh)) *
        100
      : 0;

  return (
    <p className="text-foreground/85">
      Eksport:{" "}
      <strong className="tabular-nums">
        {formatKwh(current.grid_export_kwh, 0)}
      </strong>{" "}
      vs {formatKwh(previous.grid_export_kwh, 0)} rok temu —{" "}
      <span
        className={
          exportDelta >= 0
            ? "text-[var(--savings-foreground)] font-medium"
            : "text-[var(--grid-import)] font-medium"
        }
      >
        {exportDelta >= 0 ? "+" : ""}
        {exportDelta.toFixed(0)}%
      </span>
      . Pobór:{" "}
      <strong className="tabular-nums">
        {formatKwh(current.grid_import_kwh, 0)}
      </strong>{" "}
      vs {formatKwh(previous.grid_import_kwh, 0)} rok temu —{" "}
      <span
        className={
          importDelta <= 0
            ? "text-[var(--savings-foreground)] font-medium"
            : "text-[var(--grid-import)] font-medium"
        }
      >
        {importDelta >= 0 ? "+" : ""}
        {importDelta.toFixed(0)}%
      </span>
      .
    </p>
  );
}
