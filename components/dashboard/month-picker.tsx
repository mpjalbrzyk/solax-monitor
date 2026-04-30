"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";

export type MonthOption = {
  value: string; // YYYY-MM
  label: string; // "Kwiecień 2026"
  hasData: boolean;
};

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

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="glass px-4 h-9 inline-flex items-center gap-2 text-sm font-medium tabular-nums hover:bg-white/70 transition-colors disabled:opacity-50"
      >
        <span>{currentLabel}</span>
        <ChevronDown className="size-3.5" />
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
            className="glass-strong absolute z-30 mt-2 right-0 w-56 max-h-80 overflow-y-auto rounded-xl py-1.5 text-sm"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                role="option"
                aria-selected={opt.value === current}
                onClick={() => {
                  setIsOpen(false);
                  startTransition(() => {
                    router.push(`${basePath}?month=${opt.value}`);
                  });
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-white/60 transition-colors flex items-center justify-between gap-2 ${
                  opt.value === current ? "font-semibold" : ""
                } ${!opt.hasData ? "text-muted-foreground" : ""}`}
              >
                <span>{opt.label}</span>
                {!opt.hasData && (
                  <span className="text-[10px] text-muted-foreground">brak</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
