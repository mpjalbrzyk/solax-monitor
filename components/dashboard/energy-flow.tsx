import { Sun, Home, Plug, Battery, BatteryLow } from "lucide-react";
import type { EnergyFlow, FlowArrows } from "@/lib/derive";
import { formatPower, formatPercent } from "@/lib/format";

// Tesla-style energy flow: SVG paths between nodes with animated dots flowing
// in the direction of energy transfer. Speed proportional to power. Inactive
// paths are subtle grey lines, active ones light up with the flow.
//
// Layout (responsive, breaks to stacked on mobile):
//
//        ┌───────┐
//        │  PV   │
//        └───┬───┘
//            │  ↓ pvToHome     ↓ pvToBattery     ↓ pvToGrid
//   ┌────────┴───────────┐
//   │                    │
// ┌─┴───┐  ┌─────┐  ┌────┴┐
// │Sieć │←→│ Dom │←→│Bater│
// └─────┘  └─────┘  └─────┘
//   gridToHome      batteryToHome

export function EnergyFlowDiagram({
  flow,
  arrows,
}: {
  flow: EnergyFlow;
  arrows: FlowArrows;
}) {
  // Determine active arrows for animation
  const flows = {
    pvToHome: arrows.pvToHome > 50,
    pvToGrid: arrows.pvToGrid > 50,
    pvToBattery: arrows.pvToBattery > 50,
    gridToHome: arrows.gridToHome > 50,
    batteryToHome: arrows.batteryToHome > 50,
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto py-6">
      {/* SVG layer behind the nodes for connecting paths + dots */}
      <svg
        viewBox="0 0 600 320"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {/* PV (top center) at (300, 50) */}
        {/* Grid (bottom left) at (110, 230) */}
        {/* Home (bottom center) at (300, 230) */}
        {/* Battery (bottom right) at (490, 230) */}

        <defs>
          <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.74 0.17 60)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="oklch(0.74 0.17 60)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="batteryGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.68 0.16 155)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="oklch(0.68 0.16 155)" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="gridGrad" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="oklch(0.6 0.2 25)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="oklch(0.6 0.2 25)" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* Path: PV → Home (vertical center) */}
        <Path
          id="pv-home"
          d="M 300 90 L 300 200"
          active={flows.pvToHome}
          color="pv"
        />
        {/* Path: PV → Grid (top center, sweep left) */}
        <Path
          id="pv-grid"
          d="M 300 90 Q 200 130, 150 200"
          active={flows.pvToGrid}
          color="pv"
        />
        {/* Path: PV → Battery (top center, sweep right) */}
        <Path
          id="pv-battery"
          d="M 300 90 Q 400 130, 450 200"
          active={flows.pvToBattery}
          color="pv"
        />
        {/* Path: Grid → Home (horizontal bottom-left) */}
        <Path
          id="grid-home"
          d="M 170 240 L 260 240"
          active={flows.gridToHome}
          color="grid"
        />
        {/* Path: Battery → Home (horizontal bottom-right) */}
        <Path
          id="battery-home"
          d="M 430 240 L 340 240"
          active={flows.batteryToHome}
          color="battery"
        />
      </svg>

      {/* Nodes layer */}
      <div className="relative grid grid-cols-3 gap-3 sm:gap-4">
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

        {/* Vertical spacers — replaced by SVG paths visually but maintain grid height */}
        <div className="h-12 sm:h-16" />
        <div className="h-12 sm:h-16" />
        <div className="h-12 sm:h-16" />

        {/* Bottom row: Grid - Home - Battery */}
        <Node
          icon={<Plug className="size-5" />}
          label={
            flow.gridW < -50
              ? "Pobór z sieci"
              : flow.gridW > 50
                ? "Eksport"
                : "Sieć"
          }
          value={formatPower(Math.abs(flow.gridW))}
          accent={flow.gridW < -50 ? "import" : flow.gridW > 50 ? "export" : "muted"}
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
            subValue={
              flow.batterySocPct != null
                ? formatPercent(flow.batterySocPct)
                : undefined
            }
            accent="savings"
            active={Math.abs(flow.batteryW ?? 0) > 50}
          />
        ) : (
          <Node
            icon={<BatteryLow className="size-5" />}
            label="Bateria"
            value="Brak"
            subValue="Falownik bez magazynu"
            accent="muted"
            active={false}
            muted
          />
        )}
      </div>
    </div>
  );
}

// Single SVG path with optional flowing dots when active.
// Tesla-style: 2-3 dots traveling along the path with circular animation.
function Path({
  id,
  d,
  active,
  color,
}: {
  id: string;
  d: string;
  active: boolean;
  color: "pv" | "grid" | "battery";
}) {
  const stroke =
    color === "pv"
      ? "url(#pvGrad)"
      : color === "battery"
        ? "url(#batteryGrad)"
        : "url(#gridGrad)";

  const dotColor =
    color === "pv"
      ? "oklch(0.74 0.17 60)"
      : color === "battery"
        ? "oklch(0.68 0.16 155)"
        : "oklch(0.6 0.2 25)";

  return (
    <g>
      {/* Base line — always visible, faint when inactive */}
      <path
        d={d}
        stroke={active ? stroke : "oklch(0.92 0 0)"}
        strokeWidth={active ? 2 : 1.5}
        fill="none"
        strokeLinecap="round"
        className="transition-all duration-500"
      />
      {/* Animated flowing dots — only when active */}
      {active && (
        <>
          <circle r="3.5" fill={dotColor}>
            <animateMotion dur="2.5s" repeatCount="indefinite" path={d} />
          </circle>
          <circle r="3" fill={dotColor} opacity="0.7">
            <animateMotion
              dur="2.5s"
              repeatCount="indefinite"
              begin="0.83s"
              path={d}
            />
          </circle>
          <circle r="2.5" fill={dotColor} opacity="0.5">
            <animateMotion
              dur="2.5s"
              repeatCount="indefinite"
              begin="1.66s"
              path={d}
            />
          </circle>
        </>
      )}
    </g>
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
      className={`glass relative z-10 ${ringColor[accent]} flex flex-col items-center justify-center gap-1 px-3 py-3 ${
        emphasized ? "sm:py-5" : ""
      } ${muted ? "opacity-70" : ""} ${active && accent !== "muted" && accent !== "home" ? "ring-2 ring-offset-0 ring-current/10" : ""}`}
    >
      <span className={accentColor[accent]}>{icon}</span>
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
