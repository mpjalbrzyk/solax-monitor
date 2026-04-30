// Date helpers anchored in Europe/Warsaw. We treat dates as YYYY-MM-DD
// strings in Polish local time (regardless of server tz). Conversions to
// UTC happen only at the boundary with Postgres TIMESTAMPTZ columns.

const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const HOUR_FMT = new Intl.DateTimeFormat("pl-PL", {
  timeZone: "Europe/Warsaw",
  hour: "2-digit",
  minute: "2-digit",
});

export function todayWarsaw(): string {
  return DATE_FMT.format(new Date());
}

export function isoToWarsawDate(iso: string): string {
  return DATE_FMT.format(new Date(iso));
}

export function warsawHourLabel(iso: string): string {
  return HOUR_FMT.format(new Date(iso));
}

// Add/subtract days from a YYYY-MM-DD string and return YYYY-MM-DD.
export function shiftDateString(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// First day of the month containing this date (YYYY-MM-DD).
export function firstOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

// Last day of the month containing this date (YYYY-MM-DD).
export function lastOfMonth(date: string): string {
  const [y, m] = date.split("-").map(Number);
  // Day 0 of next month = last day of this month.
  const dt = new Date(Date.UTC(y, m, 0));
  return DATE_FMT.format(dt);
}

// Shift a YYYY-MM (month string) by N months, return YYYY-MM.
export function shiftMonthString(yearMonth: string, months: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, 1));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

// ISO bounds for the Europe/Warsaw day given as YYYY-MM-DD.
// Day starts at 00:00 Warsaw local, ends just before 24:00.
// Postgres TIMESTAMPTZ stores UTC, so we convert.
export function warsawDayBoundsIso(date: string): {
  fromIso: string;
  toIso: string;
} {
  const [y, m, d] = date.split("-").map(Number);
  // Warsaw is UTC+1 (winter) or UTC+2 (summer DST). Easiest: build the local
  // date as if it were UTC, then ask Date for the offset from the actual
  // wall-clock interpretation in Warsaw.
  // Use a simple approach: construct two boundary instants by using Date and
  // subtracting the Warsaw offset at the time.
  const localStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const localEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

  const offsetStart = warsawOffsetMs(localStart);
  const offsetEnd = warsawOffsetMs(localEnd);

  return {
    fromIso: new Date(localStart.getTime() - offsetStart).toISOString(),
    toIso: new Date(localEnd.getTime() - offsetEnd).toISOString(),
  };
}

function warsawOffsetMs(at: Date): number {
  // Format the same instant as if asked in Warsaw and as if asked in UTC,
  // and diff. Resilient across DST.
  const tzFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const utcFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const tz = parseUsParts(tzFmt.format(at));
  const utc = parseUsParts(utcFmt.format(at));
  return tz.getTime() - utc.getTime();
}

function parseUsParts(s: string): Date {
  // "MM/DD/YYYY, HH:MM:SS"
  const m = s.match(
    /^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{2}):(\d{2}):(\d{2})$/,
  );
  if (!m) return new Date(s);
  const [, MM, DD, YYYY, hh, mm, ss] = m;
  return new Date(
    Date.UTC(
      Number(YYYY),
      Number(MM) - 1,
      Number(DD),
      Number(hh),
      Number(mm),
      Number(ss),
    ),
  );
}

export const PL_MONTH_SHORT = [
  "Sty",
  "Lut",
  "Mar",
  "Kwi",
  "Maj",
  "Cze",
  "Lip",
  "Sie",
  "Wrz",
  "Paź",
  "Lis",
  "Gru",
];
