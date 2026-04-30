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
