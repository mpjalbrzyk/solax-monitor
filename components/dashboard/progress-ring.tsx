// Apple Fitness / Activity-style circular progress ring. SVG with gradient
// stroke, optional second ring for "secondary" value. Stroke-dasharray
// animates from 0 to target on mount via CSS transition.

export function ProgressRing({
  primary,
  secondary,
  size = 200,
  thickness = 16,
  children,
}: {
  primary: { pct: number; gradientId: string; from: string; to: string };
  secondary?: { pct: number; gradientId: string; from: string; to: string };
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
}) {
  const center = size / 2;
  const r1 = center - thickness / 2 - 2; // outer
  const r2 = secondary ? r1 - thickness - 4 : r1; // inner if secondary

  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 absolute inset-0"
        aria-hidden
      >
        <defs>
          <linearGradient id={primary.gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={primary.from} />
            <stop offset="100%" stopColor={primary.to} />
          </linearGradient>
          {secondary && (
            <linearGradient
              id={secondary.gradientId}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor={secondary.from} />
              <stop offset="100%" stopColor={secondary.to} />
            </linearGradient>
          )}
        </defs>

        {/* Primary ring background track */}
        <circle
          cx={center}
          cy={center}
          r={r1}
          fill="none"
          stroke="oklch(0.92 0 0)"
          strokeWidth={thickness}
        />
        {/* Primary progress arc */}
        <Arc
          cx={center}
          cy={center}
          r={r1}
          thickness={thickness}
          pct={Math.min(primary.pct, 100)}
          gradientId={primary.gradientId}
        />

        {/* Secondary ring (if any) */}
        {secondary && (
          <>
            <circle
              cx={center}
              cy={center}
              r={r2}
              fill="none"
              stroke="oklch(0.94 0 0)"
              strokeWidth={thickness}
            />
            <Arc
              cx={center}
              cy={center}
              r={r2}
              thickness={thickness}
              pct={Math.min(secondary.pct, 100)}
              gradientId={secondary.gradientId}
            />
          </>
        )}
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

function Arc({
  cx,
  cy,
  r,
  thickness,
  pct,
  gradientId,
}: {
  cx: number;
  cy: number;
  r: number;
  thickness: number;
  pct: number;
  gradientId: string;
}) {
  const circumference = 2 * Math.PI * r;
  const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={`url(#${gradientId})`}
      strokeWidth={thickness}
      strokeDasharray={strokeDasharray}
      strokeLinecap="round"
      style={{
        transition: "stroke-dasharray 1.2s cubic-bezier(0.65, 0, 0.35, 1)",
      }}
    />
  );
}
