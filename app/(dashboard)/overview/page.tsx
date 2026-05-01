import { Sun, Wallet, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/header";
import { EnergyFlowDiagram } from "@/components/dashboard/energy-flow";
import { MpptSplitTile } from "@/components/dashboard/mppt-split";
import {
  SystemStatusBadge,
  deriveSystemStatus,
} from "@/components/dashboard/system-status-badge";
import { InvestmentHero } from "@/components/dashboard/investment-hero";
import { AlarmsWidget } from "@/components/dashboard/alarms-widget";
import {
  getActiveInverter,
  getCumulativeFinancials,
  getDailyAggregates,
  getHistoricalConsumption,
  getHistoricalPgeInvoices,
  getLatestDeviceReading,
  getLatestPlantReading,
  getMonthlyAggregates,
  getRecentAlarms,
  getTariffComponents,
} from "@/lib/data/queries";
import { GamificationRow } from "@/components/dashboard/gamification-row";
import { HowItWorks } from "@/components/dashboard/how-it-works";
import {
  calculateAchievements,
  calculateMilestones,
  calculatePositiveBalanceStreak,
  calculateProductionStreak,
  calculateYearlyGoalProgress,
} from "@/lib/derive/gamification";
import {
  buildOverviewSummary,
  periodMiniComment,
} from "@/lib/derive/overview-commentary";
import {
  buildLiveCommentary,
  deriveEnergyFlow,
  deriveFlowArrows,
} from "@/lib/derive";
import { buildRoiScenarios } from "@/lib/derive/forecasts";
import { calculatePgeActualSavings } from "@/lib/tariff";
import { todayWarsaw, shiftDateString } from "@/lib/date";
import {
  formatKwh,
  formatPln,
} from "@/lib/format";

export const metadata = { title: "Przegląd" };
export const dynamic = "force-dynamic";

function firstOfMonthWarsaw(): string {
  return `${todayWarsaw().slice(0, 7)}-01`;
}

export default async function OverviewPage() {
  const inverter = await getActiveInverter();

  if (!inverter) {
    return (
      <>
        <DashboardHeader title="Przegląd" recordedAt={null} />
        <Card className="glass">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Brak instalacji w bazie. Sprawdź konfigurację Supabase.
          </CardContent>
        </Card>
      </>
    );
  }

  const today = todayWarsaw();
  const monthStart = firstOfMonthWarsaw();
  const weekStart = shiftDateString(today, -6); // last 7 days incl. today

  const [
    plant,
    inverterDevice,
    batteryDevice,
    alarms,
    monthRange,
    weekRange,
    todayAgg,
    cumulative,
    history,
    pgeInvoices,
    components,
    lastYearDailies,
  ] = await Promise.all([
    getLatestPlantReading(inverter.id),
    getLatestDeviceReading(inverter.id, 1),
    getLatestDeviceReading(inverter.id, 2),
    getRecentAlarms(inverter.id, 30),
    getDailyAggregates(inverter.id, monthStart, today),
    getDailyAggregates(inverter.id, weekStart, today),
    getDailyAggregates(inverter.id, today, today).then((rs) => rs[0] ?? null),
    getCumulativeFinancials(inverter.id),
    getHistoricalConsumption(inverter.id),
    getHistoricalPgeInvoices(inverter.id),
    getTariffComponents(inverter.id),
    getDailyAggregates(inverter.id, shiftDateString(today, -365), today),
  ]);

  // Year-to-date for yearly goal — separate query, broader window
  const ytdDailies = await getDailyAggregates(
    inverter.id,
    `${today.slice(0, 4)}-01-01`,
    today,
  );
  const allMonthly = await getMonthlyAggregates(inverter.id);

  // === Gamification ===
  const productionStreak = calculateProductionStreak(lastYearDailies);
  const balanceStreak = calculatePositiveBalanceStreak(lastYearDailies);
  // Dynamic goal: pv_capacity × 1000 kWh/kWp/year (~average for woj. mazowieckie).
  // For 7,7 kWp = 7700 kWh. Round to nearest 100 for cleaner display.
  const pvCapacity = Number(inverter.pv_capacity_kwp ?? 7.7);
  const dynamicGoalKwh = Math.round((pvCapacity * 1000) / 100) * 100;
  const yearlyGoal = calculateYearlyGoalProgress(
    ytdDailies,
    allMonthly,
    today,
    dynamicGoalKwh,
  );
  const achievements = calculateAchievements(lastYearDailies, allMonthly);
  const milestones = calculateMilestones(
    lastYearDailies,
    allMonthly,
    achievements,
    9,
  );

  // === Energy flow ===
  const flow = deriveEnergyFlow(inverterDevice, batteryDevice);
  const arrows = deriveFlowArrows(flow);
  const commentary = buildLiveCommentary({ flow, plant, todayAgg });

  // === MPPT data from raw_response of latest inverter device reading ===
  const mppt =
    (inverterDevice as { raw_response?: { mpptMap?: Record<string, number> } } | null)
      ?.raw_response?.mpptMap ?? null;

  // === System status ===
  const recordedAt = inverterDevice?.recorded_at ?? plant?.recorded_at ?? null;
  const status = deriveSystemStatus({ recordedAt, alarms });

  // === ROI scenarios ===
  const installDate = inverter.installation_date
    ? new Date(inverter.installation_date)
    : new Date("2023-02-17");
  const installCost = Number(inverter.installation_cost_pln ?? 24000);
  const subsidy = Number(inverter.installation_subsidy_pln ?? 16000);

  const prePvYears = history.filter((h) => h.year < 2023);
  const avgPrePvKwhYearly =
    prePvYears.length > 0
      ? prePvYears.reduce(
          (s, h) => s + Number(h.consumption_from_grid_kwh ?? 0),
          0,
        ) / prePvYears.length
      : 5959;

  const pgeActual = calculatePgeActualSavings({
    invoices: pgeInvoices,
    components,
    avgPrePvMonthlyKwh: avgPrePvKwhYearly / 12,
  });

  const solaxAnnualRate = lastYearDailies.reduce(
    (s, d) => s + (Number(d.net_balance_pln) || 0),
    0,
  );

  const scenarios = buildRoiScenarios({
    installationDate: installDate,
    installationCostPln: installCost,
    solaxCumulativeNet: cumulative.total_net_pln,
    solaxAnnualRate,
    pgeCumulativeSavings: pgeActual.totalSavings,
  });

  // === Period summaries ===
  const dailyYield = Number(plant?.daily_yield_kwh ?? todayAgg?.yield_kwh ?? 0);
  const todayBalance =
    Number(todayAgg?.savings_pln ?? 0) +
    Number(todayAgg?.earnings_pln ?? 0) -
    Number(todayAgg?.cost_pln ?? 0);

  const weekYield = weekRange.reduce(
    (s, d) => s + Number(d.yield_kwh ?? 0),
    0,
  );
  const weekBalance = weekRange.reduce(
    (s, d) =>
      s +
      Number(d.savings_pln ?? 0) +
      Number(d.earnings_pln ?? 0) -
      Number(d.cost_pln ?? 0),
    0,
  );
  const weekDays = weekRange.length;

  const monthYield = monthRange.reduce(
    (s, d) => s + Number(d.yield_kwh ?? 0),
    0,
  );
  const monthBalance = monthRange.reduce(
    (s, d) =>
      s +
      Number(d.savings_pln ?? 0) +
      Number(d.earnings_pln ?? 0) -
      Number(d.cost_pln ?? 0),
    0,
  );

  // === Top contextual summary (after period values are computed) ===
  const summary = buildOverviewSummary({
    todayYieldKwh: dailyYield,
    todayBalancePln: todayBalance,
    weekYieldKwh: weekYield,
    weekBalancePln: weekBalance,
    weekDays,
    monthYieldKwh: monthYield,
    monthBalancePln: monthBalance,
    monthDays: monthRange.length,
    systemOk: status.status === "ok",
  });

  return (
    <>
      <DashboardHeader title="Przegląd" recordedAt={recordedAt} />

      {/* === STREFA 0 — Top contextual summary (Michał's request) === */}
      <Card className="glass mb-4">
        <CardContent className="px-5 sm:px-6 py-4">
          <div className="flex items-start gap-3">
            <SystemStatusBadge {...status} />
            <p className="text-sm sm:text-base leading-relaxed text-foreground/90 flex-1">
              {summary}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* === STREFA 1 — Energy flow + commentary === */}
      <Card className="glass-strong mb-4">
        <CardContent className="px-5 sm:px-6 py-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
                Co się dzieje teraz
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-foreground/90">
                {commentary}
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums hidden sm:inline shrink-0">
              {flow.hasBattery
                ? "PV + Bateria + Sieć"
                : "PV + Sieć (bez baterii)"}
            </span>
          </div>
          <EnergyFlowDiagram flow={flow} arrows={arrows} />
          {mppt && (
            <div className="mt-4">
              <MpptSplitTile mppt={mppt} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* === STREFA 2 — Bento grid: 3 period cards (left) + Investment Hero (right) === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        {/* Left column 2/3 — period stat cards stacked */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <PeriodCard
            label="Dziś"
            icon={<Sun className="size-4 text-[var(--pv)]" />}
            value={formatKwh(dailyYield)}
            sub="Produkcja"
            mainBalance={todayBalance}
            comment={periodMiniComment({
              period: "today",
              yieldKwh: dailyYield,
              balancePln: todayBalance,
              days: 1,
            })}
            secondaryLines={[
              { label: "Zużycie", value: formatKwh(todayAgg?.consumption_kwh) },
              { label: "Bilans", value: formatPln(todayBalance), accent: todayBalance >= 0 ? "positive" : "negative" },
            ]}
          />
          <PeriodCard
            label="Ten tydzień"
            icon={<Calendar className="size-4 text-[var(--pv)]" />}
            value={formatKwh(weekYield)}
            sub={`${weekDays} dni`}
            mainBalance={weekBalance}
            comment={periodMiniComment({
              period: "week",
              yieldKwh: weekYield,
              balancePln: weekBalance,
              days: weekDays,
            })}
            secondaryLines={[
              { label: "Średnio/dzień", value: formatKwh(weekDays > 0 ? weekYield / weekDays : 0) },
              { label: "Bilans", value: formatPln(weekBalance), accent: weekBalance >= 0 ? "positive" : "negative" },
            ]}
          />
          <PeriodCard
            label="Ten miesiąc"
            icon={<Wallet className="size-4 text-[var(--savings)]" />}
            value={formatKwh(monthYield)}
            sub={`${monthRange.length} dni`}
            mainBalance={monthBalance}
            comment={periodMiniComment({
              period: "month",
              yieldKwh: monthYield,
              balancePln: monthBalance,
              days: monthRange.length,
              todayWarsaw: today,
            })}
            secondaryLines={[
              { label: "Średnio/dzień", value: formatKwh(monthRange.length > 0 ? monthYield / monthRange.length : 0) },
              { label: "Bilans", value: formatPln(monthBalance), accent: monthBalance >= 0 ? "positive" : "negative" },
            ]}
          />
        </div>

        {/* Right column 1/3 — Investment Hero (tall) */}
        <div className="lg:col-span-1">
          <InvestmentHero
            installationCostPln={installCost}
            subsidyPln={subsidy}
            scenarios={scenarios}
          />
        </div>
      </div>

      {/* === STREFA 3 — Grywalizacja === */}
      <div className="mb-4">
        <GamificationRow
          productionStreak={productionStreak}
          balanceStreak={balanceStreak}
          yearlyGoal={yearlyGoal}
          achievements={achievements}
          milestones={milestones}
        />
      </div>

      {/* === STREFA 4 — Edukacja + alarmy === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <HowItWorks />
        <AlarmsWidget alarms={alarms} />
      </div>
    </>
  );
}

function PeriodCard({
  label,
  icon,
  value,
  sub,
  mainBalance,
  comment,
  secondaryLines,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  sub?: string;
  mainBalance: number;
  comment?: string;
  secondaryLines: Array<{
    label: string;
    value: string;
    accent?: "positive" | "negative" | "neutral";
  }>;
}) {
  void mainBalance;
  return (
    <Card className="glass">
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {label}
          </span>
          {icon}
        </div>
        <div className="text-2xl font-semibold tabular-nums leading-none">
          {value}
        </div>
        {sub && (
          <div className="text-xs text-muted-foreground mt-1">{sub}</div>
        )}
        <div className="mt-3 flex flex-col gap-0.5 border-t border-zinc-200/40 pt-2">
          {secondaryLines.map((line) => (
            <div
              key={line.label}
              className="flex items-center justify-between text-xs tabular-nums"
            >
              <span className="text-muted-foreground">{line.label}</span>
              <span
                className={
                  line.accent === "positive"
                    ? "text-[var(--savings-foreground)] font-medium"
                    : line.accent === "negative"
                      ? "text-[var(--grid-import)] font-medium"
                      : "font-medium"
                }
              >
                {line.value}
              </span>
            </div>
          ))}
        </div>
        {comment && (
          <p className="text-[11px] text-muted-foreground italic mt-2 leading-snug">
            {comment}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

