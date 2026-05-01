"use client";

import Link from "next/link";
import { ArrowRight, Mail, Download } from "lucide-react";
import { toast } from "sonner";
import type { PeriodNarration, NarrationTone } from "@/lib/derive/period-narrator";
import {
  buildMailtoHref,
  type ReportData,
} from "@/lib/derive/report-text";
import { cn } from "@/lib/utils";

const TONE_DOT: Record<NarrationTone, string> = {
  good: "bg-[var(--savings)] shadow-[0_0_8px_var(--savings)]",
  neutral: "bg-[var(--brand)] shadow-[0_0_8px_var(--brand)]",
  info: "bg-[var(--pv)] shadow-[0_0_8px_var(--pv)]",
  bad: "bg-[var(--grid-import)] shadow-[0_0_8px_var(--grid-import)]",
};

export function ReportCard({
  title,
  subtitle,
  narration,
  metrics,
  detailHref,
}: {
  title: string;
  subtitle?: string;
  narration: PeriodNarration;
  metrics: { label: string; value: string }[];
  detailHref?: string;
}) {
  const reportData: ReportData = {
    title,
    subtitle,
    narration,
    metrics,
    detailHref,
  };
  const mailto = buildMailtoHref(reportData);

  return (
    <div className="rounded-xl border border-white/40 bg-white/40 px-4 py-3 hover:bg-white/55 transition-colors">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            TONE_DOT[narration.tone],
          )}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mb-1">
            <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
            {subtitle && (
              <span className="text-[11px] text-muted-foreground">{subtitle}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
            <span className="text-foreground/85 font-medium">
              {narration.headline}.
            </span>{" "}
            {narration.body[0]}
            {narration.body.length > 1 ? " " + narration.body[1] : ""}
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            {metrics.slice(0, 3).map((m) => (
              <div key={m.label} className="text-[11px]">
                <span className="text-muted-foreground">{m.label}: </span>
                <span className="font-semibold tabular-nums">{m.value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {detailHref && (
              <Link
                href={detailHref}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--brand)] hover:underline"
              >
                Szczegóły <ArrowRight className="size-3" />
              </Link>
            )}
            <a
              href={mailto}
              className="inline-flex items-center gap-1 rounded-full bg-white/60 hover:bg-white/80 border border-zinc-200/50 px-2.5 py-1 text-[11px] text-foreground transition-colors"
              title="Otwiera Twój klient pocztowy z gotowym mailem"
            >
              <Mail className="size-3" />
              Wyślij mailem
            </a>
            <button
              type="button"
              onClick={() =>
                toast.info("PDF — wkrótce", {
                  description: "Eksport do PDF zaplanowany w Fazie 6.",
                })
              }
              className="inline-flex items-center gap-1 rounded-full bg-white/40 hover:bg-white/60 border border-zinc-200/40 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="size-3" />
              PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
