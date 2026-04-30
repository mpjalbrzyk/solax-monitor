import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function DateNav({
  basePath,
  prevHref,
  nextHref,
  current,
  todayHref,
  showToday,
}: {
  basePath: string;
  prevHref: string | null;
  nextHref: string | null;
  current: string;
  todayHref?: string | null;
  showToday?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {prevHref ? (
        <Link
          href={prevHref}
          className="glass size-9 inline-flex items-center justify-center text-foreground hover:bg-white/70 transition-colors"
          aria-label="Poprzedni"
        >
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span
          className="glass size-9 inline-flex items-center justify-center text-muted-foreground/50 opacity-50"
          aria-hidden
        >
          <ChevronLeft className="size-4" />
        </span>
      )}

      <div className="glass px-4 h-9 inline-flex items-center text-sm font-medium tabular-nums">
        {current}
      </div>

      {nextHref ? (
        <Link
          href={nextHref}
          className="glass size-9 inline-flex items-center justify-center text-foreground hover:bg-white/70 transition-colors"
          aria-label="Następny"
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span
          className="glass size-9 inline-flex items-center justify-center text-muted-foreground/50 opacity-50"
          aria-hidden
        >
          <ChevronRight className="size-4" />
        </span>
      )}

      {showToday && todayHref && (
        <Link
          href={todayHref}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          Dziś
        </Link>
      )}
      {/* Spacer when showToday hidden, basePath kept for future use */}
      {!showToday && <span className="ml-auto" data-base={basePath} />}
    </div>
  );
}
