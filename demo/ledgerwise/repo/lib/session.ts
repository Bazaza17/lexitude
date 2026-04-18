import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

// Short-lived (15 min) operator session. The session cookie is signed with
// an HMAC so the server can verify it without a DB round-trip, but the
// authoritative record lives in Redis — revocation invalidates the server
// copy immediately, so a stolen cookie is useful only until expiry.
//
// Cookie name: __Host-ledgerwise-op. The __Host- prefix forbids Domain=,
// requires Secure, and scopes Path=/, giving us sub-domain isolation.

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) throw new Error("SESSION_SECRET is not set");

export type OperatorSession = {
  userId: string;
  role: "operator" | "admin";
  expiresAt: number; // epoch ms
};

function sign(payload: string): string {
  return createHmac("sha256", SESSION_SECRET!).update(payload).digest("hex");
}

function verify(payload: string, sig: string): boolean {
  const expected = sign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function requireOperatorSession(
  req: NextRequest,
): Promise<OperatorSession | null> {
  const raw = req.cookies.get("__Host-ledgerwise-op")?.value;
  if (!raw) return null;

  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  if (!verify(payload, sig)) return null;

  let session: OperatorSession;
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (Date.now() > session.expiresAt) return null;

  return session;
}
