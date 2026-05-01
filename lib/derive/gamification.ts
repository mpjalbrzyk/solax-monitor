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
  // Use Lucide icon name; rendered by component via icon registry
  icon: "sun" | "trophy" | "sparkles" | "calendar" | "zap" | "award" | "flame";
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

// Strong-day streak — consecutive days with yield > 5 kWh (more meaningful than
// just any production). Replaces previous "positive balance streak" which was
// useless because Solax dramatically undercounts cost_pln (1.70 zł rocznie vs
// 4707 zł real PGE invoice), making every production day artificially "on plus".
//
// 5 kWh threshold ≈ 1 hour of full-power production, eliminates very gloomy
// winter days where panels barely register dawn light.
export function calculatePositiveBalanceStreak(
  dailies: DailyAggregate[],
): Streak {
  const sorted = [...dailies].sort((a, b) => b.date.localeCompare(a.date));
  const STRONG_DAY_THRESHOLD = 5;
  let count = 0;
  for (const d of sorted) {
    if (Number(d.yield_kwh ?? 0) >= STRONG_DAY_THRESHOLD) count++;
    else break;
  }
  return {
    label: "Dni z mocną produkcją",
    count,
    description:
      count >= 30
        ? `${count} dni z rzędu z produkcją ≥5 kWh — sezon w pełni.`
        : count >= 7
          ? `${count} dni z rzędu z mocną produkcją.`
          : count > 0
            ? `${count} ${count === 1 ? "dzień" : "dni"} z produkcją powyżej 5 kWh.`
            : "Ostatnio dni słabej produkcji — pochmurno albo zima.",
  };
}

// Yearly goal progress.
// Default target: 7 000 kWh — szacowany roczny pułap dla 7,7 kWp w Ząbkach.
// Liczone od 1 stycznia bieżącego roku (z daily_aggregates + jeśli mamy
// monthly_aggregates dla tego roku, fallback z monthly).
export type YearlyGoalStatus = "ahead" | "on_pace" | "behind";

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
  /** 3-tier status based on END-OF-YEAR projection vs goal, not YTD vs goal */
  status: YearlyGoalStatus;
  /** % difference from goal at end-of-year (negative = behind) */
  projectedDeltaPct: number;
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
  const projectedDeltaPct = ((projectedYearEndKwh - goalKwh) / goalKwh) * 100;

  // Status based on END-OF-YEAR PROJECTION (audit A.3 fix), not YTD progress.
  // Projection > 105% of goal → ahead, 95-105% → on pace, < 95% → behind.
  let status: YearlyGoalStatus;
  if (projectedDeltaPct > 5) status = "ahead";
  else if (projectedDeltaPct >= -5) status = "on_pace";
  else status = "behind";

  // Solar production is heavily seasonal — January linear projection is
  // misleading. Don't claim "behind plan" until at least 90 days into year
  // when we have enough sample to project meaningfully.
  if (daysIntoYear < 90 && status === "behind") {
    status = "on_pace"; // too early to call
  }

  return {
    yearLabel: year,
    producedKwh,
    goalKwh,
    pct: Math.min((producedKwh / goalKwh) * 100, 100),
    daysIntoYear,
    daysInYear,
    paceKwhPerDay,
    projectedYearEndKwh,
    isAheadOfPace: status !== "behind",
    status,
    projectedDeltaPct,
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
  if (firstBig) {
    achievements.push({
      id: "first-30kwh-day",
      label: "Dzień > 30 kWh",
      description: `Pierwszy raz panele dały ponad 30 kWh: ${firstBig.date}`,
      earnedDate: firstBig.date,
      icon: "sun",
    });
  }

  // 100 production days total
  const productionDays = dailies.filter((d) => Number(d.yield_kwh ?? 0) > 1).length;
  if (productionDays >= 100) {
    const sortedProd = sortedDays.filter((d) => Number(d.yield_kwh ?? 0) > 1);
    achievements.push({
      id: "100-production-days",
      label: "100 dni produkcji",
      description: "Sto dni z aktywną produkcją PV.",
      earnedDate: sortedProd[99]?.date ?? null,
      icon: "calendar",
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
      description: `Bilans wyszedł na plus pierwszy raz: ${firstPositiveMonth[0]}`,
      earnedDate: `${firstPositiveMonth[0]}-01`,
      icon: "zap",
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
      label: "Miesiąc > 1 MWh",
      description: `Najlepszy miesiąc do tej pory: ${(Number(peakMonth.pv_generation_kwh) / 1000).toFixed(1)} MWh`,
      earnedDate: String(peakMonth.month),
      icon: "trophy",
    });
  }

  // Streak: 7 days in a row with production
  if (productionDays >= 7) {
    achievements.push({
      id: "7-day-streak",
      label: "Tydzień produkcji",
      description: "7 dni z rzędu z aktywną produkcją PV.",
      earnedDate: sortedDays[6]?.date ?? null,
      icon: "flame",
    });
  }

  // Lifetime > 5 MWh
  const lifetimeKwh = sortedMonths.reduce(
    (s, m) => s + Number(m.pv_generation_kwh ?? 0),
    0,
  );
  if (lifetimeKwh >= 5000) {
    // Find the month when lifetime crossed 5 MWh
    let cumKwh = 0;
    let crossedMonth: string | null = null;
    for (const m of sortedMonths) {
      cumKwh += Number(m.pv_generation_kwh ?? 0);
      if (cumKwh >= 5000 && !crossedMonth) {
        crossedMonth = String(m.month);
        break;
      }
    }
    achievements.push({
      id: "5-mwh-lifetime",
      label: "5 MWh łącznie",
      description: "Pierwsza pięciotysięczna kilowatogodzina od montażu.",
      earnedDate: crossedMonth,
      icon: "award",
    });
  }

  return achievements;
}

// Recent milestones — chronological list of "co się ostatnio zdarzyło"
// timeline. Includes both achievements and notable data points.
export type Milestone = {
  date: string; // ISO date
  label: string;
  detail: string;
  icon: "trophy" | "sun" | "sparkles" | "calendar" | "zap" | "award" | "flame";
};

export function calculateMilestones(
  dailies: DailyAggregate[],
  monthly: MonthlyAggregate[],
  achievements: Achievement[],
  limit = 6,
): Milestone[] {
  const milestones: Milestone[] = [];

  // Convert earned achievements to milestones
  for (const a of achievements) {
    if (a.earnedDate) {
      milestones.push({
        date: a.earnedDate,
        label: a.label,
        detail: a.description,
        icon: a.icon as Milestone["icon"],
      });
    }
  }

  // Best month per year — for last 3 calendar years
  const yearGroups = new Map<string, MonthlyAggregate[]>();
  for (const m of monthly) {
    const year = String(m.month).slice(0, 4);
    if (!yearGroups.has(year)) yearGroups.set(year, []);
    yearGroups.get(year)!.push(m);
  }
  for (const [year, months] of yearGroups) {
    const best = months.reduce<MonthlyAggregate | null>(
      (b, m) =>
        !b ||
        Number(m.pv_generation_kwh ?? 0) > Number(b.pv_generation_kwh ?? 0)
          ? m
          : b,
      null,
    );
    if (best && Number(best.pv_generation_kwh) > 0) {
      milestones.push({
        date: String(best.month),
        label: `Najlepszy miesiąc ${year}`,
        detail: `${(Number(best.pv_generation_kwh) / 1000).toFixed(2)} MWh produkcji`,
        icon: "sparkles",
      });
    }
  }

  // Single best day across all data. Sanity check: ignore values > 100 kWh
  // (impossible for 7,7 kWp installation, max physical ~55 kWh in perfect
  // June day). Such values are corrupted backfill data.
  const MAX_REASONABLE_DAILY_KWH = 100;
  const bestDay = dailies.reduce<DailyAggregate | null>((b, d) => {
    const yld = Number(d.yield_kwh ?? 0);
    if (!Number.isFinite(yld) || yld <= 0 || yld > MAX_REASONABLE_DAILY_KWH) return b;
    if (!b || yld > Number(b.yield_kwh ?? 0)) return d;
    return b;
  }, null);
  if (bestDay && Number(bestDay.yield_kwh) > 30) {
    milestones.push({
      date: bestDay.date,
      label: "Rekord dzienny",
      detail: `${Number(bestDay.yield_kwh).toFixed(1)} kWh w jednym dniu`,
      icon: "sun",
    });
  }

  // Sort newest first, dedupe by label, limit
  const seen = new Set<string>();
  return milestones
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((m) => {
      if (seen.has(m.label)) return false;
      seen.add(m.label);
      return true;
    })
    .slice(0, limit);
}
