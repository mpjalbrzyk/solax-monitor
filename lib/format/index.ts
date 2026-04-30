// Polish-locale formatters. Always use these — never `n.toFixed()` or
// raw `toLocaleString()` — so the whole UI stays consistent.

const plPLN = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const plPLNPrecise = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plNumber1 = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const plNumber2 = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plNumber0 = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 0,
});

const plDateLong = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});

const plDateShort = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});

const plTime = new Intl.DateTimeFormat("pl-PL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Warsaw",
});

const plMonthName = new Intl.DateTimeFormat("pl-PL", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});

const plDayName = new Intl.DateTimeFormat("pl-PL", {
  weekday: "long",
  timeZone: "Europe/Warsaw",
});

const plRelative = new Intl.RelativeTimeFormat("pl-PL", { numeric: "auto" });

export function formatPln(value: number | null | undefined, precise = false): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return precise ? plPLNPrecise.format(value) : plPLN.format(value);
}

export function formatKwh(value: number | null | undefined, precision: 1 | 2 = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const formatter = precision === 2 ? plNumber2 : plNumber1;
  return `${formatter.format(value)} kWh`;
}

export function formatMwh(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${plNumber1.format(value / 1000)} MWh`;
}

// Auto-scale watts → kW above 1000W; keeps two sig figs of meaningful info.
export function formatPower(watts: number | null | undefined): string {
  if (watts == null || !Number.isFinite(watts)) return "—";
  const abs = Math.abs(watts);
  if (abs >= 1000) {
    return `${plNumber1.format(watts / 1000)} kW`;
  }
  return `${plNumber0.format(watts)} W`;
}

export function formatPercent(value: number | null | undefined, decimals = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const formatter = decimals === 0 ? plNumber0 : plNumber1;
  return `${formatter.format(value)}%`;
}

export function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (decimals === 0) return plNumber0.format(value);
  if (decimals === 2) return plNumber2.format(value);
  return plNumber1.format(value);
}

export function formatDateLong(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return plDateLong.format(date);
}

export function formatDateShort(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return plDateShort.format(date);
}

export function formatTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return plTime.format(date);
}

export function formatMonthYear(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  // Capitalize first letter — Polish month names default lowercase from Intl.
  const formatted = plMonthName.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatDayName(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const formatted = plDayName.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatRelativeTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (Math.abs(diffSec) < 60) return "teraz";
  if (Math.abs(diffMin) < 60) return plRelative.format(diffMin, "minute");
  if (Math.abs(diffHour) < 24) return plRelative.format(diffHour, "hour");
  return plRelative.format(diffDay, "day");
}
