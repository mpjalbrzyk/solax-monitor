"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";

export type MonthOption = {
  value: string; // YYYY-MM
  label: string; // "Kwiecień 2026"
  hasData: boolean;
};

// Grouped picker — months grouped by year, year headers, current month
// highlighted, "no data" months greyed out but still selectable.
export function MonthPicker({
  current,
  options,
  basePath,
}: {
  current: string;
  options: MonthOption[];
  basePath: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const currentLabel =
    options.find((o) => o.value === current)?.label ?? current;

  // Group by year
  const byYear = new Map<string, MonthOption[]>();
  for (const opt of options) {
    const year = opt.value.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(opt);
  }
  const years = Array.from(byYear.keys()).sort().reverse(); // newest first

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="glass px-4 h-9 inline-flex items-center gap-2 text-sm font-medium hover:bg-white/70 transition-colors disabled:opacity-50"
      >
        <span>{currentLabel}</span>
        <ChevronDown
          className={`size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />
          <div
            role="listbox"
            aria-label="Wybór miesiąca"
            className="glass-strong absolute z-30 mt-2 right-0 w-72 max-h-96 overflow-y-auto rounded-xl py-2 text-sm border border-white/60"
          >
            {years.map((year) => {
              const monthsInYear = byYear.get(year)!.sort((a, b) =>
                a.value.localeCompare(b.value),
              );
              const monthsWithData = monthsInYear.filter((m) => m.hasData).length;
              return (
                <div key={year} className="px-1">
                  <div className="flex items-center justify-between px-3 py-1.5 sticky top-0 bg-white/60 backdrop-blur-sm rounded-md">
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {year}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {monthsWithData}/{monthsInYear.length} mies. z danymi
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 px-1.5 py-2">
                    {monthsInYear.map((opt) => {
                      const monthShort = opt.label.split(" ")[0].slice(0, 3);
                      const isCurrent = opt.value === current;
                      return (
                        <button
                          key={opt.value}
                          role="option"
                          aria-selected={isCurrent}
                          onClick={() => {
                            setIsOpen(false);
                            startTransition(() => {
                              router.push(`${basePath}?month=${opt.value}`);
                            });
                          }}
                          className={`px-2 py-1.5 rounded-md text-xs transition-colors ${
                            isCurrent
                              ? "bg-[var(--pv)]/20 text-foreground font-semibold"
                              : opt.hasData
                                ? "hover:bg-white/60 text-foreground"
                                : "hover:bg-white/40 text-muted-foreground/70"
                          }`}
                          title={opt.hasData ? opt.label : `${opt.label} — brak danych`}
                        >
                          {monthShort}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
