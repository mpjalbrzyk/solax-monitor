import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PeriodNarration, NarrationTone } from "@/lib/derive/period-narrator";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<NarrationTone, { dot: string; ring: string }> = {
  good: {
    dot: "bg-[var(--savings)] shadow-[0_0_8px_var(--savings)]",
    ring: "ring-[var(--savings)]/30",
  },
  neutral: {
    dot: "bg-[var(--brand)] shadow-[0_0_8px_var(--brand)]",
    ring: "ring-[var(--brand)]/30",
  },
  info: {
    dot: "bg-[var(--pv)] shadow-[0_0_8px_var(--pv)]",
    ring: "ring-[var(--pv)]/30",
  },
  bad: {
    dot: "bg-[var(--grid-import)] shadow-[0_0_8px_var(--grid-import)]",
    ring: "ring-[var(--grid-import)]/30",
  },
};

export function PeriodNarrative({
  narration,
  className,
  variant = "default",
}: {
  narration: PeriodNarration;
  className?: string;
  variant?: "default" | "compact";
}) {
  const styles = TONE_STYLES[narration.tone];

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-lg border border-white/40 bg-white/40 px-3 py-2",
          className,
        )}
      >
        <span
          className={cn(
            "mt-1 size-2 shrink-0 rounded-full",
            styles.dot,
          )}
          aria-hidden
        />
        <div className="text-sm text-foreground/85 leading-relaxed">
          <span className="font-medium">{narration.headline}.</span>{" "}
          <span className="text-muted-foreground">
            {narration.body.join(" ")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("glass", className)}>
      <CardContent className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "shrink-0 size-9 rounded-xl bg-white/60 ring-1 flex items-center justify-center",
              styles.ring,
            )}
            aria-hidden
          >
            <Sparkles className="size-4 text-foreground/70" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn("size-2 rounded-full", styles.dot)}
                aria-hidden
              />
              <h3 className="text-sm font-semibold tracking-tight">
                {narration.headline}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {narration.body.join(" ")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
