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
  good: "bg-[var(--brand-600)] shadow-[0_0_8px_var(--brand-glow)]",
  neutral: "bg-[var(--brand-500)] shadow-[0_0_8px_var(--brand-glow)]",
  info: "bg-[var(--solar-500)] shadow-[0_0_8px_var(--solar-glow)]",
  bad: "bg-[var(--error-icon)] shadow-[0_0_8px_rgba(220,38,38,0.4)]",
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
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-700)] hover:text-[var(--brand-800)] hover:underline"
              >
                Szczegóły <ArrowRight className="size-3" />
              </Link>
            )}
            <a
              href={mailto}
              className="btn-brand inline-flex items-center gap-1 !py-1 !px-2.5 !text-[11px]"
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
              className="btn-ghost inline-flex items-center gap-1 !py-1 !px-2.5 !text-[11px]"
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
