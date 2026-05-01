// Two ROI scenarios — SAME starting date (installation_date) dla obu, żeby
// procenty zwrócone były porównywalne. Wcześniejsza wersja miała mismatch:
// PGE cumulative bazowała na 37 fakturach (lifetime), Solax cumulative
// na 16-miesięcznym oknie daily_aggregates (limit Solax API). To dawało
// wizualny mirage gdzie Solax pokazywał wyższy procent niż PGE chociaż
// jego annual rate był niższy.
//
//   A. Solax tempo (optymistyczny)
//      Cumulative = solaxAnnualRate × yearsSinceInstall (ekstrapolacja
//      wstecz tempa z ostatnich 365 dni na cały okres od install_date).
//      Solax raportuje import_kwh zaniżony przez bug API, więc cost_pln
//      też i annualRate jest optymistyczny.
//
//   B. Realny tempo (pesymistyczny / zbliżony do faktur)
//      Cumulative = suma savings z 37 faktur PGE (lifetime, bez ekstrapolacji
//      bo dane historyczne istnieją). AnnualRate = ostatnie 12mo PGE
//      (apples-to-apples z Solax annualRate).
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
  // Solax tempo inputs — solaxCumulativeNet zachowane dla wstecznej zgodności
  // ale NIE używane do progress%/break-even (mismatched window vs PGE).
  solaxCumulativeNet: number;
  solaxAnnualRate: number; // tempo z ostatnich 365 dni
  // Real tempo inputs (PGE-derived)
  pgeCumulativeSavings: number; // z calculatePgeActualSavings (lifetime, 37 faktur)
  // Optional: explicit last-12-months PGE rate (preferred over 3-yr avg)
  pgeLast12mRate?: number;
}): { solax: RoiScenario; real: RoiScenario } {
  const {
    installationDate,
    installationCostPln,
    solaxAnnualRate,
    pgeCumulativeSavings,
    pgeLast12mRate,
  } = args;

  const yearsSinceInstall = Math.max(
    (Date.now() - installationDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
    0.1,
  );

  // Prefer last-12-months rate (apples-to-apples with Solax tempo) when
  // provided; fallback to 3-year avg when caller hasn't computed it.
  const realAnnualRate =
    pgeLast12mRate != null && pgeLast12mRate > 0
      ? pgeLast12mRate
      : pgeCumulativeSavings / yearsSinceInstall;

  // KEY: Solax cumulative ujednolicony do tej samej bazy czasowej co PGE
  // (od install_date do dziś). Solax API daje tylko ostatnie 13 mies.
  // daily_aggregates, więc ekstrapolujemy annualRate wstecz na cały okres.
  // Dzięki temu progress% i break-even są porównywalne między scenarios.
  const solaxCumulativeExtrapolated = solaxAnnualRate * yearsSinceInstall;

  return {
    solax: scenarioOf({
      label: "Solax tempo",
      description:
        "Z pomiarów inwertera, ekstrapolowane od daty instalacji. Optymistyczne — Solax zaniża pobór z sieci, więc bilans wychodzi wyższy niż realny.",
      cumulativeNowPln: solaxCumulativeExtrapolated,
      annualRatePln: solaxAnnualRate,
      installationCostPln,
    }),
    real: scenarioOf({
      label: "Realny tempo (PGE)",
      description:
        "Z 37 faktur PGE od daty instalacji. Konserwatywny — pokazuje pieniądze które faktycznie nie poszły do PGE w porównaniu do hipotetycznego życia bez fotowoltaiki.",
      cumulativeNowPln: pgeCumulativeSavings,
      annualRatePln: realAnnualRate,
      installationCostPln,
    }),
  };
}

// === Long-term forecast (Tesla style) ===
//
// Pokazuje co się stanie za 5/10/20/25 lat przy realnym tempie i przy 3
// scenariuszach wzrostu cen energii (które historycznie rosły w Polsce
// ~8-15%/rok). Plus uwzględnia degradację paneli ~0.5%/rok.
//
// Punktem 0 jest TODAY (już za nami CAPEX). Pokazujemy ile kumulatywnie
// zarobimy przez następne lata, nie wracając do ujemnego CAPEX.

export type LongTermForecast = {
  yearLabel: string;
  yearsAhead: number;
  noPriceGrowth: number; // PLN cumulative since today, 0% energy inflation
  moderate: number; // 5% energy inflation
  high: number; // 10% energy inflation
};

export function buildLongTermForecast(args: {
  baseAnnualRatePln: number; // tempo bazowe (PGE last-12m)
  yearsToProject?: number; // default 25
  panelDegradationPctPerYear?: number; // default 0.5
}): LongTermForecast[] {
  const {
    baseAnnualRatePln,
    yearsToProject = 25,
    panelDegradationPctPerYear = 0.5,
  } = args;

  const points: LongTermForecast[] = [
    {
      yearLabel: "Dziś",
      yearsAhead: 0,
      noPriceGrowth: 0,
      moderate: 0,
      high: 0,
    },
  ];

  const currentYear = new Date().getFullYear();
  let cumNo = 0;
  let cumMod = 0;
  let cumHigh = 0;

  for (let i = 1; i <= yearsToProject; i++) {
    const degradation = Math.pow(1 - panelDegradationPctPerYear / 100, i);
    const yearlyNo = baseAnnualRatePln * degradation;
    const yearlyMod = baseAnnualRatePln * degradation * Math.pow(1.05, i);
    const yearlyHigh = baseAnnualRatePln * degradation * Math.pow(1.1, i);

    cumNo += yearlyNo;
    cumMod += yearlyMod;
    cumHigh += yearlyHigh;

    points.push({
      yearLabel: String(currentYear + i),
      yearsAhead: i,
      noPriceGrowth: Math.round(cumNo),
      moderate: Math.round(cumMod),
      high: Math.round(cumHigh),
    });
  }

  return points;
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
