import { Card, CardContent } from "@/components/ui/card";
import { InfoHint } from "./info-hint";
import { Flame, Trophy, Zap } from "lucide-react";
import { formatKwh, formatNumber } from "@/lib/format";
import type { Achievement, Streak } from "@/lib/derive/gamification";

export function GamificationRow({
  productionStreak,
  balanceStreak,
  yearlyGoal,
  achievements,
}: {
  productionStreak: Streak;
  balanceStreak: Streak;
  yearlyGoal: {
    yearLabel: string;
    producedKwh: number;
    goalKwh: number;
    pct: number;
    paceKwhPerDay: number;
    projectedYearEndKwh: number;
    isAheadOfPace: boolean;
  };
  achievements: Achievement[];
}) {
  const earnedAchievements = achievements.filter((a) => a.earnedDate !== null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Yearly goal progress (wide left) */}
      <Card className="glass lg:col-span-2">
        <CardContent className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
              Cel roczny {yearlyGoal.yearLabel}
              <InfoHint>
                Docelowa produkcja roczna {formatKwh(yearlyGoal.goalKwh, 0)} —
                szacunkowy pułap dla instalacji 7,7 kWp w Ząbkach. Pasek
                zielony jeśli idziemy szybciej niż średnia, pomarańczowy jeśli
                wolniej. Projekcja końcoworoczna na bazie obecnego tempa.
              </InfoHint>
            </span>
            <span
              className={`text-[11px] font-medium ${
                yearlyGoal.isAheadOfPace
                  ? "text-[var(--savings-foreground)]"
                  : "text-[var(--pv-foreground)]"
              }`}
            >
              {yearlyGoal.isAheadOfPace ? "Przed planem" : "Za planem"}
            </span>
          </div>
          <div className="flex items-end justify-between gap-3 mb-2">
            <div>
              <div className="text-2xl font-semibold tabular-nums leading-none">
                {formatKwh(yearlyGoal.producedKwh, 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                z {formatKwh(yearlyGoal.goalKwh, 0)} celu rocznego
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold tabular-nums leading-none">
                {yearlyGoal.pct.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                zrealizowane
              </div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                yearlyGoal.isAheadOfPace
                  ? "bg-gradient-to-r from-[var(--savings)] to-[oklch(0.78_0.15_130)]"
                  : "bg-gradient-to-r from-[var(--pv)] to-[oklch(0.78_0.16_80)]"
              }`}
              style={{ width: `${Math.min(yearlyGoal.pct, 100)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
            <span>
              Tempo: {formatNumber(yearlyGoal.paceKwhPerDay, 1)} kWh/dzień
            </span>
            <span>
              Projekcja końca roku: {formatKwh(yearlyGoal.projectedYearEndKwh, 0)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Two streaks stacked (right) */}
      <div className="flex flex-col gap-3">
        <StreakCard
          icon={<Flame className="size-4 text-[var(--pv)]" />}
          streak={productionStreak}
        />
        <StreakCard
          icon={<Zap className="size-4 text-[var(--savings)]" />}
          streak={balanceStreak}
        />
      </div>

      {/* Achievements row (full width below) */}
      {earnedAchievements.length > 0 && (
        <Card className="glass lg:col-span-3">
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
                <Trophy className="size-3.5" />
                Twoje odznaki
              </span>
              <span className="text-xs text-muted-foreground">
                {earnedAchievements.length} zdobyte
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {earnedAchievements.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/40 hover:bg-white/60 transition-colors"
                  title={a.description}
                >
                  <span className="text-2xl shrink-0" aria-hidden>
                    {a.emoji}
                  </span>
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="text-xs font-medium truncate">
                      {a.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {a.earnedDate?.slice(0, 7)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StreakCard({
  icon,
  streak,
}: {
  icon: React.ReactNode;
  streak: Streak;
}) {
  return (
    <Card className="glass">
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            {streak.label}
          </span>
          {icon}
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-semibold tabular-nums leading-none">
            {streak.count}
          </div>
          <div className="text-xs text-muted-foreground">
            {streak.count === 1 ? "dzień" : "dni"}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
          {streak.description}
        </p>
      </CardContent>
    </Card>
  );
}
