"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function RefreshIndicator({ recordedAt }: { recordedAt: string | null }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());

  // Tick the relative-time label every 30s without re-fetching.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Re-fetch the page (server component re-runs) every 5 min — picks up new
  // poll-realtime inserts. Tab visibility check avoids hammering server while
  // user has the dashboard open in a background tab.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [router]);

  const ageMs = recordedAt ? now - new Date(recordedAt).getTime() : null;
  const isFresh = ageMs != null && ageMs < 10 * 60 * 1000;
  const isStale = ageMs != null && ageMs >= 30 * 60 * 1000;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className={`inline-flex size-2 rounded-full ${
          isFresh
            ? "bg-[var(--savings)] animate-pulse"
            : isStale
              ? "bg-[var(--grid-import)]"
              : "bg-zinc-400"
        }`}
        aria-hidden
      />
      <Activity className="size-3.5 hidden sm:inline" />
      <span>
        {recordedAt
          ? `Ostatnia aktualizacja ${formatRelativeTime(recordedAt)}`
          : "Brak danych"}
      </span>
    </div>
  );
}
