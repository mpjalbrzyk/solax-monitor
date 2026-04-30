import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoHint } from "./info-hint";
import type { LucideIcon } from "lucide-react";

type Tone = "pv" | "savings" | "import" | "export" | "neutral";

const toneRing: Record<Tone, string> = {
  pv: "shadow-[inset_0_0_0_1px_oklch(0.92_0.05_60_/_0.5)]",
  savings: "shadow-[inset_0_0_0_1px_oklch(0.92_0.05_155_/_0.5)]",
  import: "shadow-[inset_0_0_0_1px_oklch(0.92_0.05_25_/_0.5)]",
  export: "shadow-[inset_0_0_0_1px_oklch(0.92_0.04_230_/_0.5)]",
  neutral: "shadow-[inset_0_0_0_1px_oklch(0.92_0_0_/_0.5)]",
};

const toneIcon: Record<Tone, string> = {
  pv: "text-[var(--pv)]",
  savings: "text-[var(--savings)]",
  import: "text-[var(--grid-import)]",
  export: "text-[var(--grid-export)]",
  neutral: "text-muted-foreground",
};

export function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  tone = "neutral",
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <Card className={`glass ${toneRing[tone]}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <span>{label}</span>
          {hint && <InfoHint>{hint}</InfoHint>}
        </CardTitle>
        <Icon className={`size-4 ${toneIcon[tone]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
