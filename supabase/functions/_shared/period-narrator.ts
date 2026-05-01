// Deno port of lib/derive/period-narrator.ts. Stays in sync manually —
// keep both files updated when changing narrator logic.
//
// Why duplicated: Edge Functions are Deno, app/ is Next.js Node — no bundler
// across boundaries. Keeping logic identical lets the email digests show
// the same narrative the dashboard does.

export type NarrationTone = "good" | "neutral" | "bad" | "info";

export type PeriodNarration = {
  headline: string;
  body: string[];
  tone: NarrationTone;
};

const PL_MONTHS = [
  "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
  "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień",
];

const PL_MONTHS_GEN = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];

const DAILY_EXPECTED_KWH: Record<number, number> = {
  1: 7, 2: 12, 3: 20, 4: 28, 5: 33, 6: 35,
  7: 35, 8: 32, 9: 24, 10: 14, 11: 7, 12: 5,
};

function monthIdx(yyyymmdd: string): number {
  return Number(yyyymmdd.slice(5, 7));
}

function clampPct(value: number, max = 999): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, -max), max);
}

function compareTone(actual: number, expected: number): NarrationTone {
  if (expected <= 0) return "neutral";
  const ratio = actual / expected;
  if (ratio >= 1.1) return "good";
  if (ratio >= 0.85) return "neutral";
  if (ratio >= 0.6) return "info";
  return "bad";
}

export function formatKwh(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(decimals).replace(".", ",")} kWh`;
}

export function formatPln(value: number, withSign = false): string {
  if (!Number.isFinite(value)) return "—";
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${Math.round(value).toLocaleString("pl-PL")} zł`;
}

function formatDateShort(yyyymmdd: string): string {
  const m = Number(yyyymmdd.slice(5, 7));
  const d = Number(yyyymmdd.slice(8, 10));
  return `${d} ${PL_MONTHS_GEN[m - 1]}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function narrateWeek(args: {
  weekStart: string;
  weekEnd: string;
  yieldKwh: number;
  savingsPln: number;
  costPln: number;
  balancePln: number;
  daysWithData: number;
  bestDayKwh: number | null;
  bestDayDate: string | null;
  prevWeekYieldKwh?: number | null;
}): PeriodNarration {
  const {
    weekStart,
    yieldKwh,
    savingsPln,
    costPln,
    balancePln,
    daysWithData,
    bestDayKwh,
    bestDayDate,
    prevWeekYieldKwh,
  } = args;

  const m = monthIdx(weekStart);
  const expectedDaily = DAILY_EXPECTED_KWH[m] ?? 20;
  const expectedWeek = expectedDaily * 7;
  const avgPerDay = daysWithData > 0 ? yieldKwh / daysWithData : 0;
  const tone = compareTone(yieldKwh, expectedWeek);
  const monthName = PL_MONTHS_GEN[m - 1] ?? "tego okresu";

  const body: string[] = [];

  if (daysWithData === 0) {
    return { headline: "Tydzień bez danych", body: ["Brak danych dla tego tygodnia."], tone: "info" };
  }

  if (avgPerDay < expectedDaily * 0.6) {
    body.push(`Tydzień słaby: ${formatKwh(yieldKwh, 0)} łącznie, średnio ${formatKwh(avgPerDay, 1)} dziennie. Oczekiwane dla ${monthName} to ok. ${formatKwh(expectedDaily, 0)} dziennie.`);
  } else if (avgPerDay < expectedDaily * 0.85) {
    body.push(`Tydzień poniżej średniej: ${formatKwh(yieldKwh, 0)} łącznie, ${formatKwh(avgPerDay, 1)}/dzień. Dla ${monthName} typowo bywa ${formatKwh(expectedDaily, 0)}/dzień.`);
  } else if (avgPerDay < expectedDaily * 1.1) {
    body.push(`Solidny tydzień: ${formatKwh(yieldKwh, 0)} łącznie, średnio ${formatKwh(avgPerDay, 1)}/dzień — typowe tempo dla ${monthName}.`);
  } else {
    body.push(`Mocny tydzień: ${formatKwh(yieldKwh, 0)} łącznie, średnio ${formatKwh(avgPerDay, 1)}/dzień — powyżej średniej.`);
  }

  if (bestDayKwh != null && bestDayDate != null && bestDayKwh > 0) {
    body.push(`Najlepszy dzień: ${formatDateShort(bestDayDate)} z ${formatKwh(bestDayKwh, 1)}.`);
  }

  if (balancePln > 50) {
    body.push(`Bilans tygodnia +${formatPln(balancePln)} — oszczędność ${formatPln(savingsPln)} pokryła koszt poboru ${formatPln(costPln)}.`);
  } else if (balancePln >= -10) {
    body.push(`Bilans tygodnia ${formatPln(balancePln)} — blisko zera, produkcja zrównoważyła pobór.`);
  } else {
    body.push(`Bilans tygodnia ${formatPln(balancePln)} — pobór z sieci (${formatPln(costPln)}) większy niż oszczędność (${formatPln(savingsPln)}).`);
  }

  if (prevWeekYieldKwh != null && prevWeekYieldKwh > 1) {
    const deltaPct = clampPct(((yieldKwh - prevWeekYieldKwh) / prevWeekYieldKwh) * 100);
    if (Math.abs(deltaPct) >= 10) {
      const verb = deltaPct > 0 ? "lepszy" : "gorszy";
      body.push(`Tydzień ${verb} od poprzedniego o ${Math.abs(Math.round(deltaPct))}%.`);
    }
  }

  let headline: string;
  if (tone === "good") headline = "Mocny tydzień";
  else if (tone === "neutral") headline = "Solidny tydzień — w normie";
  else if (tone === "info") headline = "Tydzień poniżej średniej";
  else headline = "Słaby tydzień";

  return { headline, body, tone };
}

export function narrateMonth(args: {
  monthDate: string;
  todayWarsaw: string;
  yieldKwh: number;
  savingsPln: number;
  costPln: number;
  balancePln: number;
  daysWithData: number;
  bestDayKwh: number | null;
  bestDayDate: string | null;
  selfUsePct: number | null;
  sameMonthLastYearKwh?: number | null;
}): PeriodNarration {
  const {
    monthDate, todayWarsaw, yieldKwh, savingsPln, costPln, balancePln,
    daysWithData, bestDayKwh, bestDayDate, selfUsePct, sameMonthLastYearKwh,
  } = args;

  const m = monthIdx(monthDate);
  const monthName = PL_MONTHS[m - 1] ?? "ten miesiąc";
  const expectedDaily = DAILY_EXPECTED_KWH[m] ?? 20;
  const isCurrentMonth = monthDate.slice(0, 7) === todayWarsaw.slice(0, 7);
  const dayOfMonth = isCurrentMonth ? Number(todayWarsaw.slice(8, 10)) : 31;
  const expectedToDate = expectedDaily * Math.min(dayOfMonth, 31);
  const tone = compareTone(yieldKwh, expectedToDate);

  const body: string[] = [];

  if (daysWithData === 0 && isCurrentMonth && dayOfMonth <= 2) {
    return {
      headline: `${capitalize(monthName)} dopiero się zaczął`,
      body: ["Pierwsze pełne dane pojawią się po zakończeniu dzisiejszego dnia."],
      tone: "info",
    };
  }

  if (daysWithData === 0) {
    return {
      headline: `Brak danych dla ${monthName}`,
      body: ["Solax nie zwrócił żadnego dziennego agregatu dla tego miesiąca."],
      tone: "info",
    };
  }

  const dailyAvg = yieldKwh / daysWithData;
  if (dailyAvg < expectedDaily * 0.6) {
    body.push(`${capitalize(monthName)}: ${formatKwh(yieldKwh, 0)} produkcji w ${daysWithData} dni (śr. ${formatKwh(dailyAvg, 1)}/dzień). To słaby wynik jak na ${monthName} — typowo bywa ${formatKwh(expectedDaily, 0)}/dzień.`);
  } else if (dailyAvg < expectedDaily * 0.85) {
    body.push(`${capitalize(monthName)}: ${formatKwh(yieldKwh, 0)} produkcji w ${daysWithData} dni (śr. ${formatKwh(dailyAvg, 1)}/dzień). Trochę poniżej średniej dla ${monthName}.`);
  } else if (dailyAvg < expectedDaily * 1.1) {
    body.push(`${capitalize(monthName)}: ${formatKwh(yieldKwh, 0)} produkcji w ${daysWithData} dni (śr. ${formatKwh(dailyAvg, 1)}/dzień). Solidny rezultat jak na ${monthName}.`);
  } else {
    body.push(`${capitalize(monthName)}: ${formatKwh(yieldKwh, 0)} produkcji w ${daysWithData} dni (śr. ${formatKwh(dailyAvg, 1)}/dzień). Mocny miesiąc, powyżej średniej.`);
  }

  if (bestDayKwh != null && bestDayDate != null && bestDayKwh > 0) {
    body.push(`Najlepszy dzień ${formatDateShort(bestDayDate)}: ${formatKwh(bestDayKwh, 1)}.`);
  }

  const selfUseInfo =
    selfUsePct != null && selfUsePct > 0
      ? ` Autokonsumpcja ${Math.round(selfUsePct)}%.`
      : "";
  if (balancePln > 100) {
    body.push(`Bilans miesiąca +${formatPln(balancePln)} (oszczędność ${formatPln(savingsPln)} − koszt ${formatPln(costPln)}).${selfUseInfo}`);
  } else if (balancePln >= -50) {
    body.push(`Bilans miesiąca ${formatPln(balancePln)} — blisko zera.${selfUseInfo}`);
  } else {
    body.push(`Bilans miesiąca ${formatPln(balancePln)}: dom zużył więcej z sieci niż wyprodukował.${selfUseInfo}`);
  }

  if (sameMonthLastYearKwh != null && sameMonthLastYearKwh > 5) {
    const deltaPct = clampPct(((yieldKwh - sameMonthLastYearKwh) / sameMonthLastYearKwh) * 100);
    if (Math.abs(deltaPct) >= 5) {
      const verb = deltaPct > 0 ? "lepiej" : "gorzej";
      body.push(`Rok do roku: ${verb} o ${Math.abs(Math.round(deltaPct))}% (rok temu ${formatKwh(sameMonthLastYearKwh, 0)}).`);
    }
  }

  let headline: string;
  if (tone === "good") headline = `Mocny ${monthName}`;
  else if (tone === "neutral") headline = `${capitalize(monthName)} solidnie — w normie`;
  else if (tone === "info") headline = `${capitalize(monthName)} poniżej średniej`;
  else headline = `Słaby ${monthName}`;

  return { headline, body, tone };
}
