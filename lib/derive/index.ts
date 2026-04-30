// Derived values from raw Solax readings. Sign conventions match the database
// (already normalized in poll-realtime Edge Function via _shared/solax-client):
//
//   pv_w (total_active_power_w): + = production
//   grid_w (grid_power_w):       + = export to grid, - = import from grid
//   battery_w (charge_discharge_power_w): + = discharge to house, - = charging
//
// House load is the residual: load = pv + battery_discharge - grid_export +
// grid_import. With our sign convention that simplifies to: load = pv +
// battery - grid.

import type {
  DailyAggregate,
  DeviceRealtimeReading,
  PlantRealtimeReading,
} from "@/lib/data/types";

export type EnergyFlow = {
  pvW: number;
  loadW: number;
  gridW: number; // signed: + export, - import
  batteryW: number | null; // signed: + discharge, - charge; null = no battery
  batterySocPct: number | null;
  isNight: boolean;
  hasBattery: boolean;
};

export function deriveEnergyFlow(
  inverter: DeviceRealtimeReading | null,
  battery: DeviceRealtimeReading | null,
): EnergyFlow {
  const pvW = Math.max(Number(inverter?.total_active_power_w ?? 0), 0);
  const gridW = Number(inverter?.grid_power_w ?? 0);
  const batteryW = battery?.charge_discharge_power_w != null
    ? Number(battery.charge_discharge_power_w)
    : null;
  const batterySocPct = battery?.battery_soc_pct != null
    ? Number(battery.battery_soc_pct)
    : null;
  const hasBattery = batterySocPct != null || (batteryW != null && batteryW !== 0);

  const loadW = Math.max(pvW + (batteryW ?? 0) - gridW, 0);

  return {
    pvW,
    loadW,
    gridW,
    batteryW,
    batterySocPct,
    isNight: pvW < 50,
    hasBattery,
  };
}

// Round-trip: which arrows are flowing right now, and how strong.
export type FlowArrows = {
  pvToHome: number; // W of PV being self-consumed
  pvToBattery: number; // W of PV charging the battery (positive only)
  pvToGrid: number; // W of PV exported (positive only)
  batteryToHome: number; // W from battery (positive only)
  gridToHome: number; // W from grid import (positive only)
};

export function deriveFlowArrows(flow: EnergyFlow): FlowArrows {
  const exported = Math.max(flow.gridW, 0);
  const imported = Math.max(-flow.gridW, 0);
  const charging = flow.batteryW != null ? Math.max(-flow.batteryW, 0) : 0;
  const discharging = flow.batteryW != null ? Math.max(flow.batteryW, 0) : 0;

  // PV is allocated: first to charging, then to export, the rest to home.
  // (In reality the inverter routes simultaneously, but for visualization
  // this mental model is accurate enough.)
  let pvRemaining = flow.pvW;
  const pvToBattery = Math.min(pvRemaining, charging);
  pvRemaining -= pvToBattery;
  const pvToGrid = Math.min(pvRemaining, exported);
  pvRemaining -= pvToGrid;
  const pvToHome = Math.max(pvRemaining, 0);

  return {
    pvToHome,
    pvToBattery,
    pvToGrid,
    batteryToHome: discharging,
    gridToHome: imported,
  };
}

// Plain-Polish narration of the current state. Rules-based on MVP. Phase 4
// will replace with Claude API call so the chatbot can rephrase based on
// follow-up questions.
export function buildLiveCommentary(args: {
  flow: EnergyFlow;
  plant: PlantRealtimeReading | null;
  todayAgg: DailyAggregate | null;
}): string {
  const { flow, plant, todayAgg } = args;
  const dailyYield = Number(plant?.daily_yield_kwh ?? todayAgg?.yield_kwh ?? 0);
  const dailySavings = Number(todayAgg?.savings_pln ?? 0);

  const lines: string[] = [];

  if (flow.isNight) {
    // Try to distinguish actual night vs cloudy/idle daytime by checking if
    // there's already been meaningful production today.
    const warsawHour = warsawHourOf(new Date());
    const isActualNight = warsawHour < 5 || warsawHour >= 21;
    const producedToday = dailyYield > 0.5;

    if (isActualNight) {
      lines.push("Słońce nie świeci, panele odpoczywają.");
    } else if (producedToday) {
      lines.push(
        "Panele teraz nie produkują — pewnie chmury albo falownik się wyciszył.",
      );
    } else {
      lines.push("Panele jeszcze nie ruszyły dziś z produkcją.");
    }
    if (flow.gridW < -50) {
      lines.push(
        `Dom pobiera ${formatKw(flow.loadW)} z sieci.`,
      );
    } else {
      lines.push("Dom prawie nie zużywa energii.");
    }
  } else {
    const pvKw = formatKw(flow.pvW);
    const loadKw = formatKw(flow.loadW);
    lines.push(`Panele dają ${pvKw}. Dom zużywa ${loadKw}.`);

    if (flow.gridW > 50) {
      lines.push(`Nadwyżka ${formatKw(flow.gridW)} idzie do sieci.`);
    } else if (flow.gridW < -50) {
      lines.push(`Brakuje ${formatKw(-flow.gridW)} — bierzemy z sieci.`);
    } else {
      lines.push("Bilans z siecią praktycznie zerowy.");
    }
  }

  if (dailYieldHasValue(dailyYield)) {
    const savingsPart = dailySavings > 0
      ? `, ~${plPLN0.format(dailySavings)} oszczędności`
      : "";
    lines.push(
      `Dziś +${dailyYield.toFixed(1).replace(".", ",")} kWh produkcji${savingsPart}.`,
    );
  }

  return lines.join(" ");
}

function dailYieldHasValue(v: number) {
  return Number.isFinite(v) && v > 0;
}

function warsawHourOf(d: Date): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    hour12: false,
  });
  return Number(fmt.format(d));
}

// Local-only minimal formatter — full polish lives in lib/format. We avoid
// importing from there to keep this server/client-shareable lib free of
// 'server-only' transitive imports.
const plKW1 = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const plKW0 = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });
const plPLN0 = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 0,
});

function formatKw(watts: number): string {
  const abs = Math.abs(watts);
  if (abs >= 1000) return `${plKW1.format(watts / 1000)} kW`;
  return `${plKW0.format(watts)} W`;
}
