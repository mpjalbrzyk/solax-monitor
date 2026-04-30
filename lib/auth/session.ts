// Signed session cookie. Format: base64url(payload).hexHmac
// Payload: JSON { email, iat } where iat is issued-at unix ms.
// HMAC keeps tampering off — without AUTH_SECRET in env, the signature is
// derived from a constant fallback (acceptable for single-installation MVP;
// rotate via AUTH_SECRET when this leaves the family).

import { createHmac, timingSafeEqual } from "node:crypto";
import { SESSION_TTL_SECONDS } from "./config";

const FALLBACK_SECRET = "solax-monitor-mvp-fallback-secret-do-not-rely-on";

function getSecret(): string {
  return process.env.AUTH_SECRET || FALLBACK_SECRET;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  const padded = input.replaceAll("-", "+").replaceAll("_", "/");
  return Buffer.from(padded, "base64").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export type SessionPayload = {
  email: string;
  iat: number; // unix ms
};

export function createSessionCookie(email: string): string {
  const payload: SessionPayload = {
    email: email.trim().toLowerCase(),
    iat: Date.now(),
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

export function verifySessionCookie(value: string | undefined): SessionPayload | null {
  if (!value) return null;
  const [encoded, sig] = value.split(".");
  if (!encoded || !sig) return null;

  const expected = sign(encoded);
  // Length check before timing-safe compare (it requires equal-length buffers).
  if (sig.length !== expected.length) return null;
  try {
    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encoded)) as SessionPayload;
  } catch {
    return null;
  }

  if (!payload.email || typeof payload.iat !== "number") return null;

  // TTL check
  const ageSec = (Date.now() - payload.iat) / 1000;
  if (ageSec < 0 || ageSec > SESSION_TTL_SECONDS) return null;

  return payload;
}
