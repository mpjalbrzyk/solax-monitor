import { Sun, Home, Plug, Battery, BatteryLow } from "lucide-react";
import type { EnergyFlow, FlowArrows } from "@/lib/derive";
import { formatPower, formatPercent } from "@/lib/format";

// Energy flow diagram. Four nodes (PV, House, Grid, Battery) connected by
// arrows that light up when energy is actually flowing. Layout is a 3x3 grid
// so it stays sensible on mobile (stacks naturally).
//
// Convention recap (from lib/derive):
//   pvW        always >= 0
//   gridW      + export, - import
//   batteryW   + discharge, - charge, null = no battery
export function EnergyFlowDiagram({
  flow,
  arrows,
}: {
  flow: EnergyFlow;
  arrows: FlowArrows;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
      {/* Top row: empty - PV - empty */}
      <div />
      <Node
        icon={<Sun className="size-5" />}
        label="Panele PV"
        value={formatPower(flow.pvW)}
        accent="pv"
        active={flow.pvW > 50}
      />
      <div />

      {/* Middle row: arrows */}
      <ArrowDown active={arrows.batteryToHome > 50 || arrows.gridToHome > 50} />
      <ArrowDown active={arrows.pvToHome > 50} />
      <ArrowDown active={arrows.pvToBattery > 50 || arrows.pvToGrid > 50} />

      {/* Middle row: Grid - House - Battery */}
      <Node
        icon={<Plug className="size-5" />}
        label={flow.gridW < -50 ? "Pobór z sieci" : flow.gridW > 50 ? "Eksport do sieci" : "Sieć"}
        value={formatPower(Math.abs(flow.gridW))}
        accent={flow.gridW < -50 ? "import" : "export"}
        active={Math.abs(flow.gridW) > 50}
        muted={Math.abs(flow.gridW) < 50}
      />
      <Node
        icon={<Home className="size-5" />}
        label="Dom"
        value={formatPower(flow.loadW)}
        accent="home"
        active={flow.loadW > 50}
        emphasized
      />
      {flow.hasBattery ? (
        <Node
          icon={<Battery className="size-5" />}
          label={
            flow.batteryW != null && flow.batteryW > 50
              ? "Bateria oddaje"
              : flow.batteryW != null && flow.batteryW < -50
                ? "Bateria ładuje"
                : "Bateria"
          }
          value={formatPower(Math.abs(flow.batteryW ?? 0))}
          subValue={flow.batterySocPct != null ? formatPercent(flow.batterySocPct) : undefined}
          accent="savings"
          active={Math.abs(flow.batteryW ?? 0) > 50}
        />
      ) : (
        <Node
          icon={<BatteryLow className="size-5" />}
          label="Bateria"
          value="Brak"
          accent="muted"
          active={false}
          muted
        />
      )}
    </div>
  );
}

type Accent = "pv" | "savings" | "import" | "export" | "home" | "muted";

function Node({
  icon,
  label,
  value,
  subValue,
  accent,
  active,
  muted,
  emphasized,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  accent: Accent;
  active: boolean;
  muted?: boolean;
  emphasized?: boolean;
}) {
  const accentColor: Record<Accent, string> = {
    pv: "text-[var(--pv)]",
    savings: "text-[var(--savings)]",
    import: "text-[var(--grid-import)]",
    export: "text-[var(--grid-export)]",
    home: "text-foreground",
    muted: "text-muted-foreground",
  };
  const ringColor: Record<Accent, string> = {
    pv: "shadow-[inset_0_0_0_1px_oklch(0.92_0.05_60_/_0.5)]",
    savings: "shadow-[inset_0_0_0_1px_oklch(0.92_0.05_155_/_0.5)]",
    import: "shadow-[inset_0_0_0_1px_oklch(0.92_0.05_25_/_0.5)]",
    export: "shadow-[inset_0_0_0_1px_oklch(0.92_0.04_230_/_0.5)]",
    home: "shadow-[inset_0_0_0_1px_oklch(0.92_0_0_/_0.5)]",
    muted: "shadow-[inset_0_0_0_1px_oklch(0.92_0_0_/_0.3)]",
  };

  return (
    <div
      className={`glass ${ringColor[accent]} flex flex-col items-center justify-center gap-1 px-3 py-3 ${
        emphasized ? "sm:py-5" : ""
      } ${muted ? "opacity-70" : ""} ${active ? "" : ""}`}
    >
      <span className={`${accentColor[accent]}`}>{icon}</span>
      <span className="text-[10px] sm:text-[11px] uppercase tracking-wide text-muted-foreground text-center leading-tight">
        {label}
      </span>
      <span className="text-base sm:text-lg font-semibold tabular-nums">
        {value}
      </span>
      {subValue && (
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {subValue}
        </span>
      )}
    </div>
  );
}

function ArrowDown({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center min-h-[28px] sm:min-h-[40px]">
      <div
        className={`w-px h-full transition-colors ${
          active
            ? "bg-gradient-to-b from-[var(--pv)]/0 via-[var(--pv)]/70 to-[var(--pv)]/0"
            : "bg-zinc-200"
        }`}
        aria-hidden
      />
    </div>
  );
}
