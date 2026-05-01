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
  /** YYYY-MM-DD in Europe/Warsaw — needed for season-aware narration */
  todayWarsaw?: string;
}): string {
  const { period, yieldKwh, balancePln, days, todayWarsaw } = args;

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

  // month — season-aware (audit A.4 fix)
  const month = todayWarsaw ? Number(todayWarsaw.slice(5, 7)) : null;
  const dayOfMonth = todayWarsaw ? Number(todayWarsaw.slice(8, 10)) : 31;

  // Empty / very low month
  if (yieldKwh < 5 && days < 3 && dayOfMonth < 5) {
    return "Miesiąc dopiero się zaczął — pierwsze pełne dane pojawią się dziś wieczorem.";
  }

  if (balancePln > 500) return "Bardzo dobry miesiąc — instalacja zarabia.";
  if (balancePln > 100) return "Solidny miesiąc na plusie.";
  if (balancePln > -50) {
    // Season-aware "blisko zera" reasoning
    if (month != null) {
      if ([12, 1, 2].includes(month)) return "Bilans blisko zera — typowo zimą (krótki dzień, dużo zużycia na ogrzewanie).";
      if ([11, 3].includes(month)) return "Bilans blisko zera — pora przejściowa, jeszcze słabe nasłonecznienie.";
      if ([5, 6, 7, 8].includes(month)) {
        return "Bilans słaby jak na sezon — sprawdź czy nie ma awarii albo długiego pochmurnego okresu.";
      }
      return "Bilans blisko zera — typowo dla pory roku.";
    }
    return "Bilans blisko zera.";
  }
  return "Miesiąc słaby — zużycie domu wyższe niż produkcja.";
}
