// Email-safe HTML template (inline styles, table-based layout) for digest emails.
// Compatible z Gmail / Outlook / Apple Mail. Bez dependencies.

import type { PeriodNarration, NarrationTone } from "./period-narrator.ts";

const TONE_COLOR: Record<NarrationTone, { bg: string; border: string; text: string }> = {
  good:    { bg: "#F0FDF4", border: "#86EFAC", text: "#166534" }, // brand-50/300/800
  neutral: { bg: "#F0FDF4", border: "#86EFAC", text: "#15803D" }, // jak good ale ciemniejszy text
  info:    { bg: "#FFFBEB", border: "#FCD34D", text: "#92400E" }, // solar-50/300/800
  bad:     { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" }, // error
};

export type DigestSection = {
  heading: string;
  narration: PeriodNarration;
  metrics: { label: string; value: string }[];
  detailUrl?: string;
};

export function buildDigestHtml(args: {
  title: string;
  subtitle: string;
  preheader: string;
  sections: DigestSection[];
  footerNote?: string;
  appUrl?: string;
}): string {
  const { title, subtitle, preheader, sections, footerNote, appUrl } = args;
  const sectionHtml = sections.map(buildSection).join("\n");

  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#FAFBE9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0F172A;">
  <span style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;visibility:hidden;mso-hide:all;">${escapeHtml(preheader)}</span>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:linear-gradient(135deg,#FFF4E6 0%,#FAFBE9 50%,#E8F5E9 100%);background-color:#FAFBE9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;background:#FFFFFF;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.06);overflow:hidden;">
          <!-- Header bar pomarańczowy -->
          <tr>
            <td style="background:linear-gradient(180deg,#FFF4E6 0%,#FFEDD5 100%);padding:24px 28px;border-bottom:1px solid rgba(217,119,6,0.15);">
              <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#92400E;font-weight:600;margin-bottom:4px;">Solax Monitor · 7,7 kWp · Ząbki</div>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#0F172A;letter-spacing:-0.02em;">${escapeHtml(title)}</h1>
              <p style="margin:4px 0 0;font-size:13px;color:#475569;">${escapeHtml(subtitle)}</p>
            </td>
          </tr>
          <!-- Sections -->
          ${sectionHtml}
          <!-- Footer -->
          <tr>
            <td style="padding:20px 28px;background:#FAFBE9;border-top:1px solid rgba(0,0,0,0.05);text-align:center;">
              ${appUrl ? `<a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#16A34A;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:13px;padding:10px 20px;border-radius:9999px;">Otwórz dashboard →</a>` : ""}
              ${footerNote ? `<p style="margin:16px 0 0;font-size:11px;color:#64748B;line-height:1.5;">${escapeHtml(footerNote)}</p>` : ""}
              <p style="margin:8px 0 0;font-size:10px;color:#94A3B8;">Ta wiadomość została wygenerowana automatycznie przez Solax Monitor.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildSection(section: DigestSection): string {
  const tone = TONE_COLOR[section.narration.tone];
  const metricsHtml = section.metrics
    .map(
      (m) => `
        <tr>
          <td style="padding:6px 0;color:#64748B;font-size:12px;">${escapeHtml(m.label)}</td>
          <td style="padding:6px 0;text-align:right;color:#0F172A;font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;">${escapeHtml(m.value)}</td>
        </tr>`,
    )
    .join("");

  return `
  <tr>
    <td style="padding:24px 28px;border-bottom:1px solid rgba(0,0,0,0.04);">
      <h2 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(section.heading)}</h2>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${tone.bg};border:1px solid ${tone.border};border-radius:12px;margin-bottom:16px;">
        <tr>
          <td style="padding:14px 16px;">
            <div style="font-size:14px;font-weight:600;color:${tone.text};margin-bottom:4px;">${escapeHtml(section.narration.headline)}</div>
            <div style="font-size:13px;color:#334155;line-height:1.55;">${escapeHtml(section.narration.body.join(" "))}</div>
          </td>
        </tr>
      </table>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        ${metricsHtml}
      </table>
      ${section.detailUrl ? `<div style="margin-top:14px;text-align:right;"><a href="${escapeHtml(section.detailUrl)}" style="font-size:12px;color:#15803D;text-decoration:none;font-weight:600;">Szczegóły w app →</a></div>` : ""}
    </td>
  </tr>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
