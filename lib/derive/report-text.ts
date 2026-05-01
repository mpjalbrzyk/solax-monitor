// Builds plain-text email body for "share via email" mailto: links.
// Used by /raporty — the user's own mail app opens pre-filled.

import type { PeriodNarration } from "./period-narrator";
import { formatKwh, formatPln } from "@/lib/format";

export type ReportData = {
  title: string;
  subtitle?: string;
  narration: PeriodNarration;
  metrics: { label: string; value: string }[];
  detailHref?: string;
};

export function buildEmailBody(report: ReportData): string {
  const lines: string[] = [];
  lines.push(`📊 Solax Monitor — ${report.title}`);
  if (report.subtitle) lines.push(report.subtitle);
  lines.push("");
  lines.push(report.narration.headline);
  lines.push("");
  lines.push(report.narration.body.join(" "));
  lines.push("");
  lines.push("Kluczowe liczby:");
  for (const m of report.metrics) {
    lines.push(`  • ${m.label}: ${m.value}`);
  }
  if (report.detailHref) {
    lines.push("");
    lines.push(`Szczegóły: ${report.detailHref}`);
  }
  lines.push("");
  lines.push("—");
  lines.push("Wygenerowano przez Solax Monitor (instalacja 7,7 kWp · Ząbki).");
  return lines.join("\n");
}

export function buildEmailSubject(report: ReportData): string {
  return `Solax · ${report.title}`;
}

export function buildMailtoHref(report: ReportData, baseUrl?: string): string {
  const subject = buildEmailSubject(report);
  let body = buildEmailBody(report);
  if (baseUrl && report.detailHref) {
    body = body.replace(
      `Szczegóły: ${report.detailHref}`,
      `Szczegóły: ${baseUrl}${report.detailHref}`,
    );
  }
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function metricsKwhPln(args: {
  yieldKwh: number;
  balancePln: number;
  costPln?: number;
  revenuePln?: number;
}): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [
    { label: "Produkcja", value: formatKwh(args.yieldKwh, 1) },
    { label: "Bilans", value: formatPln(args.balancePln, true) },
  ];
  if (args.revenuePln != null) {
    out.push({ label: "Oszczędność + przychód", value: formatPln(args.revenuePln, true) });
  }
  if (args.costPln != null && args.costPln > 0) {
    out.push({ label: "Koszt poboru", value: formatPln(args.costPln, true) });
  }
  return out;
}
