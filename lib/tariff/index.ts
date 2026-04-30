import type { Tariff } from "@/lib/data/types";

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
