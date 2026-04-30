// Rules-based gamification driven by daily_aggregates + monthly_aggregates.
// Research: gamification with social benchmarks lifts engagement +60-80%.
// We don't have neighbors (single-user), so we lean on personal records,
// streaks (loss-aversion psychology), and yearly goal progress bars.

import type { DailyAggregate, MonthlyAggregate } from "@/lib/data/types";

export type Streak = {
  label: string;
  count: number;
  description: string;
};

export type Achievement = {
  id: string;
  label: string;
  description: string;
  earnedDate: string | null; // ISO date
  emoji: string;
};

// Production streak — consecutive days with yield > threshold.
// "X dni z rzędu z produkcją PV"
export function calculateProductionStreak(
  dailies: DailyAggregate[],
  thresholdKwh = 1,
): Streak {
  // Sort newest first
  const sorted = [...dailies].sort((a, b) => b.date.localeCompare(a.date));
  let count = 0;
  for (const d of sorted) {
    if (Number(d.yield_kwh ?? 0) >= thresholdKwh) count++;
    else break;
  }
  return {
    label: "Dni produkcyjnych z rzędu",
    count,
    description:
      count >= 30
        ? `Świetnie — instalacja chodzi nieprzerwanie ${count} dni z rzędu.`
        : count >= 7
          ? `${count} dni z rzędu na plus — pogoda sprzyja.`
          : count > 0
            ? `${count} ${count === 1 ? "dzień" : "dni"} z produkcją.`
            : "Brak produkcji w ostatnich dniach — sprawdź czy falownik chodzi.",
  };
}

// Positive-balance streak — consecutive days where (savings + earnings - cost) > 0
export function calculatePositiveBalanceStreak(
  dailies: DailyAggregate[],
): Streak {
  const sorted = [...dailies].sort((a, b) => b.date.localeCompare(a.date));
  let count = 0;
  for (const d of sorted) {
    const balance =
      Number(d.savings_pln ?? 0) +
      Number(d.earnings_pln ?? 0) -
      Number(d.cost_pln ?? 0);
    if (balance > 0) count++;
    else break;
  }
  return {
    label: "Dni na finansowym plusie",
    count,
    description:
      count >= 14
        ? `Bilans dodatni ${count} dni z rzędu — instalacja zarabia codziennie.`
        : count >= 3
          ? `${count} dni z rzędu na plus.`
          : count > 0
            ? `${count} ${count === 1 ? "dzień" : "dni"} z dodatnim bilansem.`
            : "Ostatnio zużycie domu przewyższa produkcję — typowe zimą.",
  };
}

// Yearly goal progress.
// Default target: 7 000 kWh — szacowany roczny pułap dla 7,7 kWp w Ząbkach.
// Liczone od 1 stycznia bieżącego roku (z daily_aggregates + jeśli mamy
// monthly_aggregates dla tego roku, fallback z monthly).
export function calculateYearlyGoalProgress(
  dailies: DailyAggregate[],
  monthly: MonthlyAggregate[],
  todayWarsawIso: string,
  goalKwh = 7000,
): {
  yearLabel: string;
  producedKwh: number;
  goalKwh: number;
  pct: number;
  daysIntoYear: number;
  daysInYear: number;
  paceKwhPerDay: number;
  projectedYearEndKwh: number;
  isAheadOfPace: boolean;
} {
  const year = todayWarsawIso.slice(0, 4);
  const startOfYear = `${year}-01-01`;

  const dailyYield = dailies
    .filter((d) => d.date >= startOfYear && d.date <= todayWarsawIso)
    .reduce((s, d) => s + Number(d.yield_kwh ?? 0), 0);

  // For older months in current year that aren't in dailies (e.g. Solax
  // 13-month window cutoff), fall back to monthly_aggregates.
  const dailyMonthsCovered = new Set(
    dailies
      .filter((d) => d.date >= startOfYear)
      .map((d) => d.date.slice(0, 7)),
  );
  const monthlyFallback = monthly
    .filter(
      (m) =>
        String(m.month).startsWith(year) &&
        !dailyMonthsCovered.has(String(m.month).slice(0, 7)),
    )
    .reduce((s, m) => s + Number(m.pv_generation_kwh ?? 0), 0);

  const producedKwh = dailyYield + monthlyFallback;

  // Days metrics
  const startOfYearDate = new Date(`${year}-01-01T00:00:00Z`);
  const todayDate = new Date(`${todayWarsawIso}T00:00:00Z`);
  const daysIntoYear =
    Math.floor(
      (todayDate.getTime() - startOfYearDate.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;
  const isLeap =
    (Number(year) % 4 === 0 && Number(year) % 100 !== 0) ||
    Number(year) % 400 === 0;
  const daysInYear = isLeap ? 366 : 365;

  const paceKwhPerDay = daysIntoYear > 0 ? producedKwh / daysIntoYear : 0;
  const projectedYearEndKwh = paceKwhPerDay * daysInYear;
  const expectedByNow = (goalKwh / daysInYear) * daysIntoYear;
  const isAheadOfPace = producedKwh >= expectedByNow;

  return {
    yearLabel: year,
    producedKwh,
    goalKwh,
    pct: Math.min((producedKwh / goalKwh) * 100, 100),
    daysIntoYear,
    daysInYear,
    paceKwhPerDay,
    projectedYearEndKwh,
    isAheadOfPace,
  };
}

// Achievements — mostly "first time X" badges. Earned timestamps inferred
// from data, not stored in DB (keeps it simple for MVP).
export function calculateAchievements(
  dailies: DailyAggregate[],
  monthly: MonthlyAggregate[],
): Achievement[] {
  const sortedDays = [...dailies].sort((a, b) => a.date.localeCompare(b.date));
  const sortedMonths = [...monthly].sort((a, b) =>
    String(a.month).localeCompare(String(b.month)),
  );

  const achievements: Achievement[] = [];

  // First day > 30 kWh
  const firstBig = sortedDays.find((d) => Number(d.yield_kwh ?? 0) > 30);
  achievements.push({
    id: "first-30kwh-day",
    label: "Pierwszy >30 kWh",
    description: "Pierwszy dzień gdy panele dały ponad 30 kWh.",
    earnedDate: firstBig?.date ?? null,
    emoji: "☀️",
  });

  // 100 production days total
  const productionDays = dailies.filter((d) => Number(d.yield_kwh ?? 0) > 1).length;
  if (productionDays >= 100) {
    const sortedProd = sortedDays.filter((d) => Number(d.yield_kwh ?? 0) > 1);
    achievements.push({
      id: "100-production-days",
      label: "100 dni produkcji",
      description: "Sto dni z aktywną produkcją PV.",
      earnedDate: sortedProd[99]?.date ?? null,
      emoji: "💯",
    });
  }

  // First positive-balance month
  const monthlyBalances = new Map<string, number>();
  for (const d of dailies) {
    const ym = d.date.slice(0, 7);
    const bal =
      Number(d.savings_pln ?? 0) +
      Number(d.earnings_pln ?? 0) -
      Number(d.cost_pln ?? 0);
    monthlyBalances.set(ym, (monthlyBalances.get(ym) ?? 0) + bal);
  }
  const firstPositiveMonth = [...monthlyBalances.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .find(([, bal]) => bal > 0);
  if (firstPositiveMonth) {
    achievements.push({
      id: "first-positive-month",
      label: "Pierwszy plus miesiąca",
      description: "Pierwszy miesiąc gdy bilans finansowy wyszedł na plus.",
      earnedDate: `${firstPositiveMonth[0]}-01`,
      emoji: "💚",
    });
  }

  // Best monthly production peak
  const peakMonth = sortedMonths.reduce<MonthlyAggregate | null>(
    (best, m) =>
      !best || Number(m.pv_generation_kwh ?? 0) > Number(best.pv_generation_kwh ?? 0)
        ? m
        : best,
    null,
  );
  if (peakMonth && Number(peakMonth.pv_generation_kwh) > 1000) {
    achievements.push({
      id: "1000-kwh-month",
      label: "Miesiąc >1 MWh",
      description: `Najlepszy miesiąc do tej pory: ${(Number(peakMonth.pv_generation_kwh) / 1000).toFixed(1)} MWh`,
      earnedDate: String(peakMonth.month),
      emoji: "🏆",
    });
  }

  return achievements;
}
