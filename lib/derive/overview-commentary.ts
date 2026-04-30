// Two-tier rules-based commentary for the Overview top:
//   * Top "podsumowanie dziś / tydzień / miesiąc" — 2-3 zdania zbiorcze
//   * Per-period mini-comments — 1 zdanie pod każdą kartą Dziś/Tydzień/Miesiąc
//
// Plus rules for "Czy system pracuje normalnie?" combined verdict.

import { formatKwh, formatPln } from "@/lib/format";

export function buildOverviewSummary(args: {
  todayYieldKwh: number;
  todayBalancePln: number;
  weekYieldKwh: number;
  weekBalancePln: number;
  weekDays: number;
  monthYieldKwh: number;
  monthBalancePln: number;
  monthDays: number;
  systemOk: boolean;
}): string {
  const {
    todayYieldKwh,
    weekYieldKwh,
    weekDays,
    monthYieldKwh,
    monthBalancePln,
    monthDays,
    systemOk,
  } = args;

  const lines: string[] = [];

  // First sentence — current state
  if (todayYieldKwh < 0.5) {
    lines.push(
      `Dziś panele jeszcze nic nie wyprodukowały (${formatKwh(todayYieldKwh, 1)}).`,
    );
  } else if (todayYieldKwh < 10) {
    lines.push(
      `Dziś produkcja niska — ${formatKwh(todayYieldKwh, 1)}. Pewnie pochmurno.`,
    );
  } else if (todayYieldKwh < 25) {
    lines.push(`Dziś solidnie — ${formatKwh(todayYieldKwh, 1)}.`);
  } else {
    lines.push(`Dziś mocno — ${formatKwh(todayYieldKwh, 1)} produkcji.`);
  }

  // Second sentence — week summary
  if (weekDays > 0) {
    const weekAvg = weekYieldKwh / weekDays;
    if (weekAvg > 25) {
      lines.push(
        `W tym tygodniu solidne tempo: ${formatKwh(weekAvg, 1)} dziennie (${formatKwh(weekYieldKwh, 0)} łącznie).`,
      );
    } else if (weekAvg > 10) {
      lines.push(
        `W tym tygodniu średnio ${formatKwh(weekAvg, 1)} dziennie (${formatKwh(weekYieldKwh, 0)} łącznie).`,
      );
    } else {
      lines.push(
        `W tym tygodniu produkcja słaba — ${formatKwh(weekAvg, 1)} dziennie.`,
      );
    }
  }

  // Third sentence — month + verdict
  if (monthDays > 0) {
    const balanceTone =
      monthBalancePln > 100 ? "na dobrym plusie" : monthBalancePln > 0 ? "na plusie" : "blisko zera";
    lines.push(
      `Bilans miesiąca: ${formatPln(monthBalancePln)} ${balanceTone} po ${monthDays} dniach. ${
        systemOk
          ? "System pracuje normalnie."
          : "Sprawdź alarmy poniżej — coś wymaga uwagi."
      }`,
    );
  }

  return lines.join(" ");
}

export function periodMiniComment(args: {
  period: "today" | "week" | "month";
  yieldKwh: number;
  balancePln: number;
  days: number;
}): string {
  const { period, yieldKwh, balancePln, days } = args;

  if (period === "today") {
    if (yieldKwh < 0.5) return "Pochmurny dzień / panele nieaktywne.";
    if (yieldKwh < 10) return "Słaby dzień — pewnie chmury.";
    if (yieldKwh < 25) return "Solidny dzień produkcji.";
    return "Mocny dzień — sporo nadwyżek.";
  }

  if (period === "week") {
    const avg = days > 0 ? yieldKwh / days : 0;
    if (avg > 30) return "Tydzień rekordowy — letnia pełnia.";
    if (avg > 15) return "Solidny tydzień, sezon w pełni.";
    if (avg > 5) return "Tydzień średni — pora przejściowa.";
    return "Słaby tydzień — zima / długie chmury.";
  }

  // month
  if (balancePln > 500) return "Bardzo dobry miesiąc — instalacja zarabia.";
  if (balancePln > 100) return "Solidny miesiąc na plusie.";
  if (balancePln > -50) return "Bilans blisko zera — typowo zimą.";
  return "Miesiąc słaby — zużycie domu wyższe niż produkcja.";
}
