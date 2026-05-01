import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/header";
import { ReportCard } from "@/components/dashboard/report-card";
import { FileBarChart2, Mail, Calendar, CalendarRange, CalendarFold } from "lucide-react";
import {
  getActiveInverter,
  getDailyAggregates,
  getMonthlyAggregates,
  getHistoricalPgeInvoices,
} from "@/lib/data/queries";
import { todayWarsaw, shiftDateString, PL_MONTH_SHORT } from "@/lib/date";
import { formatKwh, formatMonthYear, formatPln } from "@/lib/format";
import {
  narrateWeek,
  narrateMonth,
  narrateYear,
} from "@/lib/derive/period-narrator";
import { metricsKwhPln } from "@/lib/derive/report-text";

export const metadata = { title: "Raporty" };
export const dynamic = "force-dynamic";

// Monday of the ISO week containing this date.
function mondayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatWeekLabel(monday: string): string {
  const sunday = shiftDateString(monday, 6);
  const [, mMon, dMon] = monday.split("-");
  const [, mSun, dSun] = sunday.split("-");
  if (mMon === mSun) return `${Number(dMon)}–${Number(dSun)}.${mMon}`;
  return `${Number(dMon)}.${mMon} – ${Number(dSun)}.${mSun}`;
}

export default async function ReportsPage() {
  const today = todayWarsaw();
  const inverter = await getActiveInverter();

  if (!inverter) {
    return (
      <>
        <DashboardHeader title="Raporty" recordedAt={null} />
        <Card className="glass">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Brak instalacji w bazie.
          </CardContent>
        </Card>
      </>
    );
  }

  const todayMonday = mondayOf(today);
  // Pobierz ostatnie 90 dni dla raportów tygodniowych + miesięcznych
  const from90 = shiftDateString(today, -90);
  const [last90Days, monthlySolax, pgeInvoices] = await Promise.all([
    getDailyAggregates(inverter.id, from90, today),
    getMonthlyAggregates(inverter.id),
    getHistoricalPgeInvoices(inverter.id),
  ]);

  // ── Raporty tygodniowe — ostatnie 6 tygodni ──
  const weeklyReports = Array.from({ length: 6 }, (_, i) => {
    const weekStart = shiftDateString(todayMonday, -i * 7);
    const weekEnd = shiftDateString(weekStart, 6);
    const prevWeekStart = shiftDateString(weekStart, -7);
    const prevWeekEnd = shiftDateString(weekStart, -1);

    const weekDays = last90Days.filter(
      (d) => d.date >= weekStart && d.date <= weekEnd,
    );
    const prevDays = last90Days.filter(
      (d) => d.date >= prevWeekStart && d.date <= prevWeekEnd,
    );

    if (weekDays.length === 0 && i > 0) return null; // skip empty historical weeks

    const yieldKwh = weekDays.reduce((s, d) => s + Number(d.yield_kwh ?? 0), 0);
    const costPln = weekDays.reduce((s, d) => s + Number(d.cost_pln ?? 0), 0);
    const revenuePln = weekDays.reduce(
      (s, d) =>
        s + Number(d.savings_pln ?? 0) + Number(d.earnings_pln ?? 0),
      0,
    );
    const balancePln = revenuePln - costPln;
    const daysWithData = weekDays.filter((d) => Number(d.yield_kwh ?? 0) > 0).length;
    const bestDay = weekDays.reduce<{ kwh: number; date: string | null }>(
      (acc, d) => {
        const k = Number(d.yield_kwh ?? 0);
        if (k > acc.kwh) return { kwh: k, date: d.date };
        return acc;
      },
      { kwh: 0, date: null },
    );
    const prevYield = prevDays.reduce(
      (s, d) => s + Number(d.yield_kwh ?? 0),
      0,
    );

    const narration = narrateWeek({
      weekStart,
      weekEnd,
      yieldKwh,
      savingsPln: revenuePln,
      costPln,
      balancePln,
      daysWithData,
      bestDayKwh: bestDay.kwh > 0 ? bestDay.kwh : null,
      bestDayDate: bestDay.date,
      prevWeekYieldKwh: prevYield > 0 ? prevYield : null,
    });

    return {
      key: weekStart,
      title:
        i === 0
          ? `Bieżący tydzień (${formatWeekLabel(weekStart)})`
          : `Tydzień ${formatWeekLabel(weekStart)}`,
      subtitle:
        daysWithData > 0
          ? `${daysWithData}/7 dni z danymi`
          : "brak danych",
      narration,
      metrics: metricsKwhPln({
        yieldKwh,
        balancePln,
        costPln,
        revenuePln,
      }),
      detailHref: `/weekly?week=${weekStart}`,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  // ── Raporty miesięczne — ostatnie 6 miesięcy ──
  const monthsWithData = new Set<string>();
  for (const d of last90Days) monthsWithData.add(d.date.slice(0, 7));
  for (const m of monthlySolax) monthsWithData.add(String(m.month).slice(0, 7));
  for (const inv of pgeInvoices) monthsWithData.add(inv.month_date.slice(0, 7));

  const sortedMonths = Array.from(monthsWithData).sort().reverse().slice(0, 12);

  const monthlyReports = await Promise.all(
    sortedMonths.map(async (ym) => {
      // Use last90Days where possible (current quarter), else fallback to PGE invoice
      const monthDays = last90Days.filter((d) => d.date.startsWith(ym));
      const yieldKwh = monthDays.reduce(
        (s, d) => s + Number(d.yield_kwh ?? 0),
        0,
      );
      const costPln = monthDays.reduce(
        (s, d) => s + Number(d.cost_pln ?? 0),
        0,
      );
      const revenuePln = monthDays.reduce(
        (s, d) =>
          s + Number(d.savings_pln ?? 0) + Number(d.earnings_pln ?? 0),
        0,
      );
      const balancePln = revenuePln - costPln;
      const daysWithData = monthDays.length;
      const bestDay = monthDays.reduce<{ kwh: number; date: string | null }>(
        (acc, d) => {
          const k = Number(d.yield_kwh ?? 0);
          if (k > acc.kwh) return { kwh: k, date: d.date };
          return acc;
        },
        { kwh: 0, date: null },
      );
      const selfUseAvg = (() => {
        const valid = monthDays.filter((d) => d.self_use_rate_pct != null);
        if (valid.length === 0) return null;
        return (
          valid.reduce((s, d) => s + Number(d.self_use_rate_pct ?? 0), 0) /
          valid.length
        );
      })();

      // Fallback dla starych miesięcy (przed Solax pollingiem) — użyj PGE invoice
      const pgeInv = pgeInvoices.find((i) => i.month_date.startsWith(ym));
      const useFallback = daysWithData === 0 && pgeInv != null;

      let narration;
      let metrics;

      if (useFallback && pgeInv) {
        // PGE-only path: produkcja ≈ eksport (lower bound), bilans = depozyt - faktury
        const fallbackYield = Number(pgeInv.grid_export_kwh ?? 0);
        const fallbackBalance = Number(pgeInv.deposit_value_pln ?? 0);
        narration = narrateMonth({
          monthDate: `${ym}-01`,
          todayWarsaw: today,
          yieldKwh: fallbackYield,
          savingsPln: fallbackBalance,
          costPln: 0,
          balancePln: fallbackBalance,
          daysWithData: 30,
          bestDayKwh: null,
          bestDayDate: null,
          selfUsePct: null,
        });
        metrics = [
          {
            label: "Eksport (PGE)",
            value: formatKwh(fallbackYield, 0),
          },
          {
            label: "Depozyt prosumencki",
            value: formatPln(fallbackBalance, true),
          },
          {
            label: "Pobór",
            value: formatKwh(Number(pgeInv.grid_import_kwh ?? 0), 0),
          },
        ];
      } else {
        narration = narrateMonth({
          monthDate: `${ym}-01`,
          todayWarsaw: today,
          yieldKwh,
          savingsPln: revenuePln,
          costPln,
          balancePln,
          daysWithData,
          bestDayKwh: bestDay.kwh > 0 ? bestDay.kwh : null,
          bestDayDate: bestDay.date,
          selfUsePct: selfUseAvg,
        });
        metrics = metricsKwhPln({
          yieldKwh,
          balancePln,
          costPln,
          revenuePln,
        });
      }

      return {
        key: ym,
        title: formatMonthYear(`${ym}-01`),
        subtitle: useFallback
          ? "ze źródła: faktura PGE"
          : daysWithData > 0
            ? `${daysWithData} dni z danymi Solax`
            : "brak danych",
        narration,
        metrics,
        detailHref: `/monthly?month=${ym}`,
      };
    }),
  );

  // ── Raporty roczne ──
  const yearsSet = new Set<number>();
  for (const m of monthlySolax) yearsSet.add(Number(String(m.month).slice(0, 4)));
  for (const inv of pgeInvoices) yearsSet.add(Number(inv.month_date.slice(0, 4)));
  const years = Array.from(yearsSet).sort().reverse();

  const yearlyReports = years.map((year) => {
    // Roczne agregaty z PGE + Solax monthly
    let yieldKwh = 0;
    let exportKwh = 0;
    let importKwh = 0;
    let depositPln = 0;
    let bestMonth: { kwh: number; date: string | null } = { kwh: 0, date: null };
    let monthsCovered = 0;

    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2, "0")}`;
      const solax = monthlySolax.find((s) => String(s.month).startsWith(ym));
      const pgeRow = pgeInvoices.find((i) => i.month_date.startsWith(ym));
      const monthYield = Number(solax?.pv_generation_kwh ?? 0);
      const monthExport = Number(pgeRow?.grid_export_kwh ?? 0);
      if (monthYield > 0 || monthExport > 0) monthsCovered++;
      yieldKwh += monthYield;
      exportKwh += monthExport;
      importKwh += Number(pgeRow?.grid_import_kwh ?? 0);
      depositPln += Number(pgeRow?.deposit_value_pln ?? 0);

      const k = monthYield > 0 ? monthYield : monthExport;
      if (k > bestMonth.kwh) {
        bestMonth = { kwh: k, date: `${ym}-01` };
      }
    }

    const prevYear = year - 1;
    let prevYieldKwh = 0;
    for (const s of monthlySolax) {
      if (String(s.month).startsWith(String(prevYear))) {
        prevYieldKwh += Number(s.pv_generation_kwh ?? 0);
      }
    }
    if (prevYieldKwh === 0) {
      for (const inv of pgeInvoices) {
        if (inv.month_date.startsWith(String(prevYear))) {
          prevYieldKwh += Number(inv.grid_export_kwh ?? 0);
        }
      }
    }

    const useYield = yieldKwh > 0 ? yieldKwh : exportKwh;

    const narration = narrateYear({
      year,
      todayWarsaw: today,
      yieldKwh: useYield,
      savingsPln: depositPln,
      costPln: 0,
      balancePln: depositPln,
      monthsCovered,
      bestMonthKwh: bestMonth.kwh > 0 ? bestMonth.kwh : null,
      bestMonthDate: bestMonth.date,
      prevYearYieldKwh: prevYieldKwh > 0 ? prevYieldKwh : null,
      pvCapacityKwp: Number(inverter.pv_capacity_kwp ?? 7.7),
    });

    const metrics = [
      {
        label: yieldKwh > 0 ? "Produkcja" : "Eksport",
        value: formatKwh(useYield, 0),
      },
      {
        label: "Depozyt PGE",
        value: formatPln(depositPln, true),
      },
      {
        label: "Pobór z sieci",
        value: formatKwh(importKwh, 0),
      },
    ];

    return {
      key: String(year),
      title: `Rok ${year}`,
      subtitle: `${monthsCovered}/12 miesięcy z danymi`,
      narration,
      metrics,
      detailHref: `/yearly?year=${year}`,
    };
  });

  return (
    <>
      <DashboardHeader title="Raporty" recordedAt={null} />

      {/* Banner intro */}
      <Card className="glass mb-4">
        <CardContent className="px-5 sm:px-6 py-4">
          <div className="flex items-start gap-3">
            <div
              className="size-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--brand-100)",
                boxShadow: "inset 0 0 0 1px var(--brand-300)",
              }}
              aria-hidden
            >
              <FileBarChart2 className="size-5" style={{ color: "var(--brand-600)" }} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold tracking-tight mb-1">
                Raporty zbiorcze
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Wszystkie okresy z narracją "co się działo + dlaczego". Każdy
                raport możesz wysłać do siebie mailem (otwiera Twój klient
                pocztowy z gotowym treścią) albo otworzyć szczegóły. Wysyłka
                automatyczna mailem w cyklu tygodniowym/miesięcznym dojdzie w
                Fazie 6 (Resend cron).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tygodniowe */}
      <Card className="glass mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="size-4 text-[var(--brand-600)]" />
            Tygodniowe — ostatnie 6 tygodni
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {weeklyReports.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Brak danych tygodniowych.
            </p>
          ) : (
            weeklyReports.map((r) => (
              <ReportCard
                key={r.key}
                title={r.title}
                subtitle={r.subtitle}
                narration={r.narration}
                metrics={r.metrics}
                detailHref={r.detailHref}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Miesięczne */}
      <Card className="glass mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarRange className="size-4 text-[var(--brand-600)]" />
            Miesięczne — ostatnie 12 miesięcy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {monthlyReports.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Brak danych miesięcznych.
            </p>
          ) : (
            monthlyReports.map((r) => (
              <ReportCard
                key={r.key}
                title={r.title}
                subtitle={r.subtitle}
                narration={r.narration}
                metrics={r.metrics}
                detailHref={r.detailHref}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Roczne */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarFold className="size-4 text-[var(--brand-600)]" />
            Roczne
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {yearlyReports.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Brak danych rocznych.
            </p>
          ) : (
            yearlyReports.map((r) => (
              <ReportCard
                key={r.key}
                title={r.title}
                subtitle={r.subtitle}
                narration={r.narration}
                metrics={r.metrics}
                detailHref={r.detailHref}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Footer info — co dalej */}
      <div className="mt-4 px-3 text-[11px] text-muted-foreground flex items-start gap-2">
        <Mail className="size-3 mt-0.5 shrink-0" />
        <p>
          Mailowa wysyłka automatyczna (cotygodniowa/miesięczna) wymaga
          integracji Resend — zaplanowane na Fazę 6.
        </p>
      </div>
    </>
  );
}
