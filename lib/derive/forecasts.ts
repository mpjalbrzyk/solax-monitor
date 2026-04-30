// Two ROI scenarios:
//
//   A. Solax tempo (optymistyczny)
//      Bazuje na sumie net_balance_pln z daily_aggregates ostatniego roku.
//      Solax raportuje import_kwh zaniżony, więc cost_pln też. Stąd
//      net_balance wychodzi optimistic — pokazuje realniejszy obraz "ile
//      panele wyprodukowały i ile to wartości w cenach taryfy", ale ignoruje
//      faktyczny rachunek PGE.
//
//   B. Realny tempo (pesymistyczny / zbliżony do faktur)
//      Bazuje na PGE-actual cumulative savings (z historical_pge_invoices ×
//      tariff_components per miesiąc) podzielonych przez liczbę lat od
//      instalacji. Liczba ta uwzględnia faktyczne rachunki PGE i historyczne
//      ceny energii — bardziej konserwatywna, bliższa rzeczywistego zwrotu.
//
// Oba scenariusze są przydatne: Solax pokazuje "ile teoretycznie" (ile by
// wyszło bez bugów Solax importEnergy), realny pokazuje "ile faktycznie"
// w pieniądzach które nie poszły do PGE.

export type RoiScenario = {
  label: string;
  description: string;
  cumulativeNowPln: number;
  annualRatePln: number;
  yearsToBreakEven: number; // can be negative if already returned
  breakEvenYear: number;
  breakEvenDate: Date;
  progressPct: number; // 0-100
  isReturned: boolean;
};

export function buildRoiScenarios(args: {
  installationDate: Date;
  installationCostPln: number; // 24 000 (po dotacji)
  // Solax tempo inputs
  solaxCumulativeNet: number; // suma net_balance z daily_aggregates
  solaxAnnualRate: number; // tempo z ostatnich 365 dni
  // Real tempo inputs (PGE-derived)
  pgeCumulativeSavings: number; // z calculatePgeActualSavings
  // (annualRate liczymy tu z cumulative / yearsSinceInstall)
}): { solax: RoiScenario; real: RoiScenario } {
  const {
    installationDate,
    installationCostPln,
    solaxCumulativeNet,
    solaxAnnualRate,
    pgeCumulativeSavings,
  } = args;

  const yearsSinceInstall = Math.max(
    (Date.now() - installationDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
    0.1,
  );

  const realAnnualRate = pgeCumulativeSavings / yearsSinceInstall;

  return {
    solax: scenarioOf({
      label: "Solax tempo",
      description:
        "Z bieżących pomiarów inwertera (daily_aggregates). Optymistyczne — Solax zaniża pobór z sieci, więc bilans wychodzi wyższy niż realny.",
      cumulativeNowPln: solaxCumulativeNet,
      annualRatePln: solaxAnnualRate,
      installationCostPln,
    }),
    real: scenarioOf({
      label: "Realny tempo (PGE)",
      description:
        "Z faktur PGE i historycznego zużycia rodziny przed PV. Konserwatywny — pokazuje pieniądze które faktycznie nie poszły do PGE w porównaniu do hipotetycznego życia bez fotowoltaiki.",
      cumulativeNowPln: pgeCumulativeSavings,
      annualRatePln: realAnnualRate,
      installationCostPln,
    }),
  };
}

// Build year-by-year cumulative curve for the break-even chart.
// Curve starts at -installationCostPln (CAPEX) at the install year,
// climbs by annual rate each subsequent year, becoming positive after
// break-even. Past years grow linearly (we don't have month-precise
// historical cumulative for both scenarios — proportional to time elapsed).
// Future years extrapolate with the annual rate.
export function buildBreakEvenCurve(args: {
  installationDate: Date;
  installationCostPln: number;
  scenarios: { solax: RoiScenario; real: RoiScenario };
  yearsAhead?: number;
}): {
  yearLabel: string;
  yearFraction: number;
  real: number | null;
  solax: number | null;
  isProjection: boolean;
}[] {
  const {
    installationDate,
    installationCostPln,
    scenarios,
    yearsAhead = 8,
  } = args;
  const startYear = installationDate.getFullYear();
  const today = new Date();
  const currentYear = today.getFullYear();
  const yearsSinceInstall =
    (today.getTime() - installationDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

  const points: {
    yearLabel: string;
    yearFraction: number;
    real: number | null;
    solax: number | null;
    isProjection: boolean;
  }[] = [];

  // Anchor point — install year, both at -CAPEX
  points.push({
    yearLabel: String(startYear),
    yearFraction: startYear,
    real: -installationCostPln,
    solax: -installationCostPln,
    isProjection: false,
  });

  // Yearly snapshots from install year + 1 to current year
  for (let year = startYear + 1; year <= currentYear; year++) {
    const elapsed = year - startYear;
    const realCum =
      -installationCostPln +
      (scenarios.real.cumulativeNowPln *
        Math.min(elapsed, yearsSinceInstall)) /
        Math.max(yearsSinceInstall, 0.1);
    const solaxCum =
      -installationCostPln +
      (scenarios.solax.cumulativeNowPln *
        Math.min(elapsed, yearsSinceInstall)) /
        Math.max(yearsSinceInstall, 0.1);
    points.push({
      yearLabel: String(year),
      yearFraction: year,
      real: realCum,
      solax: solaxCum,
      isProjection: false,
    });
  }

  // Future projection
  const lastReal =
    -installationCostPln + scenarios.real.cumulativeNowPln;
  const lastSolax =
    -installationCostPln + scenarios.solax.cumulativeNowPln;
  for (let year = currentYear + 1; year <= currentYear + yearsAhead; year++) {
    const yearsFromNow = year - currentYear;
    points.push({
      yearLabel: String(year),
      yearFraction: year,
      real: lastReal + scenarios.real.annualRatePln * yearsFromNow,
      solax: lastSolax + scenarios.solax.annualRatePln * yearsFromNow,
      isProjection: true,
    });
  }

  return points;
}

function scenarioOf(args: {
  label: string;
  description: string;
  cumulativeNowPln: number;
  annualRatePln: number;
  installationCostPln: number;
}): RoiScenario {
  const { label, description, cumulativeNowPln, annualRatePln, installationCostPln } = args;
  const remaining = installationCostPln - cumulativeNowPln;
  const isReturned = remaining <= 0;
  const yearsToBreakEven =
    annualRatePln > 0 ? remaining / annualRatePln : Infinity;
  const now = new Date();
  const breakEvenDate = new Date(now.getTime());
  breakEvenDate.setFullYear(now.getFullYear() + Math.floor(yearsToBreakEven));
  breakEvenDate.setMonth(now.getMonth() + Math.round((yearsToBreakEven % 1) * 12));
  const progressPct = Math.min((cumulativeNowPln / installationCostPln) * 100, 100);

  return {
    label,
    description,
    cumulativeNowPln,
    annualRatePln,
    yearsToBreakEven,
    breakEvenYear: breakEvenDate.getFullYear(),
    breakEvenDate,
    progressPct,
    isReturned,
  };
}
