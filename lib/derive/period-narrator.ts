// Rules-based narrator for każdy okres (day/week/month/year).
// Cel: prosty język, "co się działo + dlaczego + co dalej".
// Zero LLM, deterministyczne — to samo wejście daje to samo wyjście.

import { formatKwh, formatPln } from "@/lib/format";

export type NarrationTone = "good" | "neutral" | "bad" | "info";

export type PeriodNarration = {
  headline: string;
  body: string[]; // 2-4 zdań prostym językiem
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

// Sezonowe oczekiwania produkcji dla 7,7 kWp (kWh/dzień, średnia długoterminowa).
// Z historii instalacji + ogólnych statystyk dla Polski centralnej.
const DAILY_EXPECTED_KWH: Record<number, number> = {
  1: 7,   // sty
  2: 12,  // lut
  3: 20,  // mar
  4: 28,  // kwi
  5: 33,  // maj
  6: 35,  // cze
  7: 35,  // lip
  8: 32,  // sie
  9: 24,  // wrz
  10: 14, // paź
  11: 7,  // lis
  12: 5,  // gru
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

// ────────────────────────────────────────────────────────────────────────────
// DAY
// ────────────────────────────────────────────────────────────────────────────

export function narrateDay(args: {
  date: string; // YYYY-MM-DD
  todayWarsaw: string; // YYYY-MM-DD
  yieldKwh: number;
  savingsPln: number;
  costPln: number;
  balancePln: number;
  selfUsePct: number | null;
  peakProductionW: number | null;
}): PeriodNarration {
  const {
    date,
    todayWarsaw,
    yieldKwh,
    savingsPln,
    costPln,
    balancePln,
    selfUsePct,
    peakProductionW,
  } = args;

  const isToday = date === todayWarsaw;
  const m = monthIdx(date);
  const expectedKwh = DAILY_EXPECTED_KWH[m] ?? 20;
  const tone = compareTone(yieldKwh, expectedKwh);
  const monthName = PL_MONTHS_GEN[m - 1] ?? "tego miesiąca";

  const body: string[] = [];

  // Linia 1 — produkcja w kontekście sezonu
  if (yieldKwh < 0.5) {
    body.push(
      isToday
        ? "Panele jeszcze nic dziś nie wyprodukowały — albo wczesna pora, albo bardzo pochmurno."
        : `Tego dnia panele praktycznie nie pracowały (${formatKwh(yieldKwh, 1)}). Pełne zachmurzenie albo śnieg na panelach.`,
    );
  } else if (yieldKwh < expectedKwh * 0.6) {
    body.push(
      `Produkcja słaba: ${formatKwh(yieldKwh, 1)} przy oczekiwanych ~${formatKwh(expectedKwh, 0)} dla ${monthName}. Pewnie zachmurzenie.`,
    );
  } else if (yieldKwh < expectedKwh * 0.85) {
    body.push(
      `Produkcja poniżej średniej: ${formatKwh(yieldKwh, 1)} (oczekiwane ~${formatKwh(expectedKwh, 0)} dla ${monthName}).`,
    );
  } else if (yieldKwh < expectedKwh * 1.1) {
    body.push(
      `Produkcja w normie: ${formatKwh(yieldKwh, 1)} — typowy dzień jak na ${monthName}.`,
    );
  } else {
    body.push(
      `Mocny dzień: ${formatKwh(yieldKwh, 1)} produkcji, powyżej średniej dla ${monthName}.`,
    );
  }

  // Linia 2 — pieniądze
  if (yieldKwh >= 0.5) {
    if (balancePln > 5) {
      const selfUseInfo =
        selfUsePct != null && selfUsePct >= 30
          ? ` Autokonsumpcja ${Math.round(selfUsePct)}% — większość zużyta na miejscu.`
          : "";
      body.push(
        `Bilans dnia +${formatPln(balancePln)} (oszczędność ${formatPln(savingsPln)} − koszt ${formatPln(costPln)}).${selfUseInfo}`,
      );
    } else if (balancePln >= -5) {
      body.push(
        `Bilans neutralny (${formatPln(balancePln)}) — produkcja pokryła zużycie domu.`,
      );
    } else {
      body.push(
        `Bilans ujemny ${formatPln(balancePln)} — dom więcej zużył z sieci niż wyprodukował z paneli.`,
      );
    }
  } else if (costPln > 0.5) {
    body.push(
      `Bez produkcji dom kupił prąd z sieci za ${formatPln(costPln)}.`,
    );
  }

  // Linia 3 — peak power albo rada na jutro
  if (peakProductionW != null && peakProductionW > 1000 && yieldKwh > 5) {
    const peakKw = peakProductionW / 1000;
    body.push(
      `Szczyt produkcji ${peakKw.toFixed(1)} kW — typowo w okolicach południa.`,
    );
  } else if (isToday && yieldKwh < expectedKwh * 0.85 && yieldKwh >= 0.5) {
    body.push("Jutro może być lepiej — sprawdź prognozę pogody.");
  }

  // Headline
  let headline: string;
  if (yieldKwh < 0.5) {
    headline = isToday ? "Dzień się jeszcze nie rozkręcił" : "Dzień bez produkcji";
  } else if (tone === "good") {
    headline = "Mocny dzień produkcji";
  } else if (tone === "neutral") {
    headline = "Solidny dzień — w normie";
  } else if (tone === "info") {
    headline = "Dzień poniżej średniej";
  } else {
    headline = "Słaby dzień — niska produkcja";
  }

  return { headline, body, tone };
}

// ────────────────────────────────────────────────────────────────────────────
// WEEK
// ────────────────────────────────────────────────────────────────────────────

export function narrateWeek(args: {
  weekStart: string; // YYYY-MM-DD
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

  // Linia 1 — średnia dzienna
  if (daysWithData === 0) {
    body.push("Brak danych dla tego tygodnia.");
    return { headline: "Tydzień bez danych", body, tone: "info" };
  }

  if (avgPerDay < expectedDaily * 0.6) {
    body.push(
      `Tydzień słaby: ${formatKwh(yieldKwh, 0)} łącznie, średnio ${formatKwh(avgPerDay, 1)} dziennie. Oczekiwane dla ${monthName} to ok. ${formatKwh(expectedDaily, 0)} dziennie.`,
    );
  } else if (avgPerDay < expectedDaily * 0.85) {
    body.push(
      `Tydzień poniżej średniej: ${formatKwh(yieldKwh, 0)} łącznie, ${formatKwh(avgPerDay, 1)}/dzień. Dla ${monthName} typowo bywa ${formatKwh(expectedDaily, 0)}/dzień.`,
    );
  } else if (avgPerDay < expectedDaily * 1.1) {
    body.push(
      `Solidny tydzień: ${formatKwh(yieldKwh, 0)} łącznie, średnio ${formatKwh(avgPerDay, 1)}/dzień — typowe tempo dla ${monthName}.`,
    );
  } else {
    body.push(
      `Mocny tydzień: ${formatKwh(yieldKwh, 0)} łącznie, średnio ${formatKwh(avgPerDay, 1)}/dzień — powyżej średniej.`,
    );
  }

  // Linia 2 — najlepszy dzień
  if (bestDayKwh != null && bestDayDate != null && bestDayKwh > 0) {
    const dayLabel = formatDateShort(bestDayDate);
    body.push(`Najlepszy dzień: ${dayLabel} z ${formatKwh(bestDayKwh, 1)}.`);
  }

  // Linia 3 — pieniądze
  if (balancePln > 50) {
    body.push(
      `Bilans tygodnia +${formatPln(balancePln)} — oszczędność ${formatPln(savingsPln)} pokryła koszt poboru ${formatPln(costPln)}.`,
    );
  } else if (balancePln >= -10) {
    body.push(
      `Bilans tygodnia ${formatPln(balancePln)} — blisko zera, produkcja zrównoważyła pobór.`,
    );
  } else {
    body.push(
      `Bilans tygodnia ${formatPln(balancePln)} — pobór z sieci (${formatPln(costPln)}) większy niż oszczędność (${formatPln(savingsPln)}).`,
    );
  }

  // Linia 4 — porównanie z poprzednim tygodniem (opcjonalnie)
  if (prevWeekYieldKwh != null && prevWeekYieldKwh > 1) {
    const deltaPct = clampPct(((yieldKwh - prevWeekYieldKwh) / prevWeekYieldKwh) * 100);
    if (Math.abs(deltaPct) >= 10) {
      const verb = deltaPct > 0 ? "lepszy" : "gorszy";
      body.push(
        `Tydzień ${verb} od poprzedniego o ${Math.abs(Math.round(deltaPct))}%.`,
      );
    }
  }

  let headline: string;
  if (tone === "good") headline = "Mocny tydzień";
  else if (tone === "neutral") headline = "Solidny tydzień — w normie";
  else if (tone === "info") headline = "Tydzień poniżej średniej";
  else headline = "Słaby tydzień";

  return { headline, body, tone };
}

// ────────────────────────────────────────────────────────────────────────────
// MONTH
// ────────────────────────────────────────────────────────────────────────────

export function narrateMonth(args: {
  monthDate: string; // YYYY-MM-01
  todayWarsaw: string;
  yieldKwh: number;
  savingsPln: number;
  costPln: number;
  balancePln: number;
  daysWithData: number;
  bestDayKwh: number | null;
  bestDayDate: string | null;
  selfUsePct: number | null;
  prevMonthYieldKwh?: number | null;
  sameMonthLastYearKwh?: number | null;
}): PeriodNarration {
  const {
    monthDate,
    todayWarsaw,
    yieldKwh,
    savingsPln,
    costPln,
    balancePln,
    daysWithData,
    bestDayKwh,
    bestDayDate,
    selfUsePct,
    sameMonthLastYearKwh,
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
      body: [
        "Pierwsze pełne dane pojawią się po zakończeniu dzisiejszego dnia.",
        "Tymczasem zerknij na zakładkę Dziś — tam wszystko live.",
      ],
      tone: "info",
    };
  }

  if (daysWithData === 0) {
    return {
      headline: `Brak danych dla ${monthName}`,
      body: [
        "Solax nie zwrócił żadnego dziennego agregatu dla tego miesiąca.",
        "Możliwe że to okres przed pierwszym pollingiem albo backfill nie dosięgnął.",
      ],
      tone: "info",
    };
  }

  // Linia 1 — produkcja
  const dailyAvg = yieldKwh / daysWithData;
  if (dailyAvg < expectedDaily * 0.6) {
    body.push(
      `${capitalize(monthName)}: ${formatKwh(yieldKwh, 0)} produkcji w ${daysWithData} dni (śr. ${formatKwh(dailyAvg, 1)}/dzień). To słaby wynik jak na ${monthName} — typowo bywa ${formatKwh(expectedDaily, 0)}/dzień.`,
    );
  } else if (dailyAvg < expectedDaily * 0.85) {
    body.push(
      `${capitalize(monthName)}: ${formatKwh(yieldKwh, 0)} produkcji w ${daysWithData} dni (śr. ${formatKwh(dailyAvg, 1)}/dzień). Trochę poniżej średniej dla ${monthName}.`,
    );
  } else if (dailyAvg < expectedDaily * 1.1) {
    body.push(
      `${capitalize(monthName)}: ${formatKwh(yieldKwh, 0)} produkcji w ${daysWithData} dni (śr. ${formatKwh(dailyAvg, 1)}/dzień). Solidny rezultat jak na ${monthName}.`,
    );
  } else {
    body.push(
      `${capitalize(monthName)}: ${formatKwh(yieldKwh, 0)} produkcji w ${daysWithData} dni (śr. ${formatKwh(dailyAvg, 1)}/dzień). Mocny miesiąc, powyżej średniej.`,
    );
  }

  // Linia 2 — best day
  if (bestDayKwh != null && bestDayDate != null && bestDayKwh > 0) {
    body.push(
      `Najlepszy dzień ${formatDateShort(bestDayDate)}: ${formatKwh(bestDayKwh, 1)}.`,
    );
  }

  // Linia 3 — pieniądze + autokonsumpcja
  const selfUseInfo =
    selfUsePct != null && selfUsePct > 0
      ? ` Autokonsumpcja ${Math.round(selfUsePct)}%.`
      : "";
  if (balancePln > 100) {
    body.push(
      `Bilans miesiąca +${formatPln(balancePln)} (oszczędność ${formatPln(savingsPln)} − koszt ${formatPln(costPln)}).${selfUseInfo}`,
    );
  } else if (balancePln >= -50) {
    body.push(
      `Bilans miesiąca ${formatPln(balancePln)} — blisko zera.${selfUseInfo}`,
    );
  } else {
    body.push(
      `Bilans miesiąca ${formatPln(balancePln)}: dom zużył więcej z sieci niż wyprodukował.${selfUseInfo}`,
    );
  }

  // Linia 4 — YoY (opcjonalnie)
  if (sameMonthLastYearKwh != null && sameMonthLastYearKwh > 5) {
    const deltaPct = clampPct(
      ((yieldKwh - sameMonthLastYearKwh) / sameMonthLastYearKwh) * 100,
    );
    if (Math.abs(deltaPct) >= 5) {
      const verb = deltaPct > 0 ? "lepiej" : "gorzej";
      body.push(
        `Rok do roku: ${verb} o ${Math.abs(Math.round(deltaPct))}% (rok temu ${formatKwh(sameMonthLastYearKwh, 0)}).`,
      );
    }
  }

  let headline: string;
  if (tone === "good") headline = `Mocny ${monthName}`;
  else if (tone === "neutral") headline = `${capitalize(monthName)} solidnie — w normie`;
  else if (tone === "info") headline = `${capitalize(monthName)} poniżej średniej`;
  else headline = `Słaby ${monthName}`;

  return { headline, body, tone };
}

// ────────────────────────────────────────────────────────────────────────────
// YEAR
// ────────────────────────────────────────────────────────────────────────────

export function narrateYear(args: {
  year: number;
  todayWarsaw: string;
  yieldKwh: number;
  savingsPln: number;
  costPln: number;
  balancePln: number;
  monthsCovered: number; // 1-12
  bestMonthKwh: number | null;
  bestMonthDate: string | null;
  prevYearYieldKwh?: number | null;
  pvCapacityKwp: number;
}): PeriodNarration {
  const {
    year,
    todayWarsaw,
    yieldKwh,
    savingsPln,
    costPln,
    balancePln,
    monthsCovered,
    bestMonthKwh,
    bestMonthDate,
    prevYearYieldKwh,
    pvCapacityKwp,
  } = args;

  const isCurrentYear = String(year) === todayWarsaw.slice(0, 4);
  const todayMonth = Number(todayWarsaw.slice(5, 7));
  const annualGoalKwh = pvCapacityKwp * 1000; // 7,7 kWp → 7700 kWh
  const body: string[] = [];

  if (monthsCovered === 0) {
    return {
      headline: `Brak danych dla ${year}`,
      body: ["Ten rok jeszcze nie ma żadnych danych w bazie."],
      tone: "info",
    };
  }

  // Linia 1 — produkcja + cel
  const goalRatio = (yieldKwh / annualGoalKwh) * 100;
  const expectedToDate = isCurrentYear
    ? sumExpectedToDate(todayMonth)
    : sumExpectedToDate(12);
  const tone = compareTone(yieldKwh, expectedToDate);

  if (isCurrentYear) {
    body.push(
      `${year}: ${formatKwh(yieldKwh, 0)} produkcji do ${formatDateShort(todayWarsaw)} — ${Math.round(goalRatio)}% celu rocznego ${formatKwh(annualGoalKwh, 0)}.`,
    );
  } else {
    body.push(
      `${year}: ${formatKwh(yieldKwh, 0)} produkcji w ${monthsCovered} miesiącach — ${Math.round(goalRatio)}% celu rocznego ${formatKwh(annualGoalKwh, 0)}.`,
    );
  }

  // Linia 2 — best month
  if (bestMonthKwh != null && bestMonthDate != null) {
    const bestM = monthIdx(bestMonthDate);
    body.push(
      `Najlepszy miesiąc: ${PL_MONTHS[bestM - 1]} z ${formatKwh(bestMonthKwh, 0)}.`,
    );
  }

  // Linia 3 — pieniądze
  if (balancePln > 500) {
    body.push(
      `Bilans roku +${formatPln(balancePln)}: oszczędność ${formatPln(savingsPln)} − koszt poboru ${formatPln(costPln)}.`,
    );
  } else if (balancePln >= 0) {
    body.push(
      `Bilans roku +${formatPln(balancePln)} — instalacja na lekkim plusie.`,
    );
  } else {
    body.push(
      `Bilans roku ${formatPln(balancePln)} — koszt poboru wyższy niż oszczędności z autokonsumpcji.`,
    );
  }

  // Linia 4 — YoY i projekcja
  if (prevYearYieldKwh != null && prevYearYieldKwh > 100) {
    const deltaPct = clampPct(
      ((yieldKwh - prevYearYieldKwh) / prevYearYieldKwh) * 100,
    );
    if (Math.abs(deltaPct) >= 5) {
      const verb = deltaPct > 0 ? "lepszy" : "gorszy";
      body.push(
        `Rok ${verb} od ${year - 1} o ${Math.abs(Math.round(deltaPct))}% (rok temu ${formatKwh(prevYearYieldKwh, 0)}).`,
      );
    }
  }

  if (isCurrentYear && monthsCovered >= 3) {
    const projected = (yieldKwh / monthsCovered) * 12;
    const projectedRatio = (projected / annualGoalKwh) * 100;
    if (projectedRatio > 105) {
      body.push(
        `Tempem na koniec roku spodziewane ${formatKwh(projected, 0)} (+${Math.round(projectedRatio - 100)}% nad celem).`,
      );
    } else if (projectedRatio < 95) {
      body.push(
        `Tempem na koniec roku spodziewane ${formatKwh(projected, 0)} (${Math.round(projectedRatio - 100)}% wzgl. celu).`,
      );
    }
  }

  let headline: string;
  if (tone === "good") headline = `${year} — rok powyżej średniej`;
  else if (tone === "neutral") headline = `${year} — w normie`;
  else if (tone === "info") headline = `${year} — poniżej średniej`;
  else headline = `${year} — słaby rok`;

  return { headline, body, tone };
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function sumExpectedToDate(monthInclusive: number): number {
  let total = 0;
  for (let i = 1; i <= monthInclusive; i++) {
    const expected = DAILY_EXPECTED_KWH[i] ?? 20;
    const days = [4, 6, 9, 11].includes(i) ? 30 : i === 2 ? 28 : 31;
    total += expected * days;
  }
  return total;
}

function formatDateShort(yyyymmdd: string): string {
  const m = Number(yyyymmdd.slice(5, 7));
  const d = Number(yyyymmdd.slice(8, 10));
  return `${d} ${PL_MONTHS_GEN[m - 1]}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
