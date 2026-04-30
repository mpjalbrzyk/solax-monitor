import type { HistoricalPgeInvoice, Tariff, TariffComponent } from "@/lib/data/types";

// Helpers for converting raw kWh into PLN using the tariff config.
// MVP: single-zone tariffs (G11). Multi-zone (G12, G12w) gets added when
// any user actually has them — the schema's `zones` JSONB already allows it.

export function getZoneRateBrutto(tariff: Tariff | null): number {
  if (!tariff || !tariff.zones || tariff.zones.length === 0) return 0;
  // DB seed uses `price_brutto_pln_kwh`; older drafts had `rate_brutto_pln_kwh`.
  // Read both for safety.
  const z = tariff.zones[0] as Record<string, unknown>;
  return Number(z.price_brutto_pln_kwh ?? z.rate_brutto_pln_kwh) || 0;
}

export function getMonthlyFixedCharges(tariff: Tariff | null): number {
  if (!tariff) return 0;
  return (
    Number(tariff.fixed_handling_pln_month ?? 0) +
    Number(tariff.fixed_distribution_pln_month ?? 0) +
    Number(tariff.fixed_capacity_pln_month ?? 0) +
    Number(tariff.fixed_oze_pln_month ?? 0) +
    Number(tariff.fixed_other_pln_month ?? 0)
  );
}

// RCEm history is keyed by `YYYY-MM`; returns the most recent rate available
// at-or-before the requested month (so e.g. requesting 2026-04 falls back to
// 2026-02 if newer hasn't been published yet).
export function getRcemRate(
  tariff: Tariff | null,
  yearMonth: string,
): number {
  if (!tariff?.rcem_history) return 0;
  const keys = Object.keys(tariff.rcem_history)
    .filter((k) => k <= yearMonth)
    .sort()
    .reverse();
  if (keys.length === 0) return 0;
  return Number(tariff.rcem_history[keys[0]]) || 0;
}

// Convert kWh import → cost in PLN brutto, given tariff at the time.
export function calculateImportCost(
  kwh: number,
  tariff: Tariff | null,
): number {
  return kwh * getZoneRateBrutto(tariff);
}

// Convert kWh export → earnings in PLN gross, given RCEm for the month.
// rcem_history values are PLN/MWh, so divide by 1000.
export function calculateExportEarnings(
  kwh: number,
  tariff: Tariff | null,
  yearMonth: string,
): number {
  return (kwh * getRcemRate(tariff, yearMonth)) / 1000;
}

// === New helpers backed by tariff_components + historical_pge_invoices ===

// Effective price per kWh for a given month (PLN/kWh brutto).
// Sums variable components (energia czynna, sieciowa zmienna, jakosciowa,
// mocowa zmienna parts, OZE, kogeneracyjna, akcyza) and applies VAT.
// Fixed monthly components are NOT included here (use getMonthlyFixedFromComponents).
export function getEffectivePricePerKwhBrutto(
  components: TariffComponent[],
  yearMonth: string, // YYYY-MM
): number {
  const targetDate = `${yearMonth}-15`; // pick mid-month to dodge boundary edges

  let total = 0;
  for (const c of components) {
    if (c.unit_rate_netto == null) continue; // skip fixed-monthly components
    if (c.effective_from > targetDate) continue;
    if (c.effective_to && c.effective_to < targetDate) continue;
    total += Number(c.unit_rate_netto) * (1 + Number(c.vat_rate));
  }
  return total;
}

export function getMonthlyFixedFromComponents(
  components: TariffComponent[],
  yearMonth: string,
): number {
  const targetDate = `${yearMonth}-15`;
  let total = 0;
  for (const c of components) {
    if (c.monthly_rate_netto == null) continue;
    if (c.effective_from > targetDate) continue;
    if (c.effective_to && c.effective_to < targetDate) continue;
    total += Number(c.monthly_rate_netto) * (1 + Number(c.vat_rate));
  }
  return total;
}

// Authoritative PGE-actual cumulative savings calculation.
// For each month with a PGE invoice row:
//   actual_cost = grid_import × effective_price_brutto + monthly_fixed
//   hypothetical_cost_no_pv = (avg pre-PV monthly consumption) × effective_price_brutto
//                              + monthly_fixed
//   savings = hypothetical - actual + deposit_value_pln
// Returns total savings in PLN brutto since first invoice.
export function calculatePgeActualSavings(args: {
  invoices: HistoricalPgeInvoice[];
  components: TariffComponent[];
  avgPrePvMonthlyKwh: number;
}): {
  totalSavings: number;
  totalActualCost: number;
  totalHypotheticalNoPv: number;
  totalDepositPln: number;
  monthsCounted: number;
} {
  const { invoices, components, avgPrePvMonthlyKwh } = args;

  let totalActual = 0;
  let totalHypo = 0;
  let totalDeposit = 0;

  for (const inv of invoices) {
    const ym = inv.month_date.slice(0, 7);
    const pricePerKwh = getEffectivePricePerKwhBrutto(components, ym);
    const monthlyFixed = getMonthlyFixedFromComponents(components, ym);

    const actualCost = Number(inv.grid_import_kwh) * pricePerKwh + monthlyFixed;
    const hypoCost = avgPrePvMonthlyKwh * pricePerKwh + monthlyFixed;

    totalActual += actualCost;
    totalHypo += hypoCost;
    totalDeposit += Number(inv.deposit_value_pln);
  }

  return {
    totalSavings: Math.max(totalHypo - totalActual + totalDeposit, 0),
    totalActualCost: totalActual,
    totalHypotheticalNoPv: totalHypo,
    totalDepositPln: totalDeposit,
    monthsCounted: invoices.length,
  };
}
