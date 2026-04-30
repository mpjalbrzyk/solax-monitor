// Email allowlist auth (MVP). No magic link, no email send — user enters
// their address, we check it against ALLOWED_EMAILS env, and set a signed
// cookie. Replaces magic link planned for Phase 7.

export const SESSION_COOKIE_NAME = "solax_session";
export const SESSION_TTL_DAYS = 30;
export const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;

// Fallback list when ALLOWED_EMAILS env is not set. Lets the dashboard
// boot on a fresh Vercel preview without manual config — Michał + tata
// test address. Add more via env when needed.
const FALLBACK_ALLOWED = [
  "mpjalbrzyk@gmail.com",
  "mpjecommerce@gmail.com",
];

export function getAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_EMAILS;
  const list = raw
    ? raw
        .split(/[,;\s]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0 && e.includes("@"))
    : FALLBACK_ALLOWED;
  return list.length > 0 ? list : FALLBACK_ALLOWED;
}

export function isEmailAllowed(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return getAllowedEmails().includes(normalized);
}
