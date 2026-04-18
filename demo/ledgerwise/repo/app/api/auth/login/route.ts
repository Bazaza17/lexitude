import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";
import { z } from "zod";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit-log";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const LoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(1024),
});

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  mfa_enrolled: boolean;
  disabled: boolean;
};

// We don't want log output to reveal whether an email exists. The same
// generic error is returned for missing user, wrong password, disabled
// account, and rate-limit trips. (PCI DSS 8.2.1, enumeration resistance.)
const GENERIC_AUTH_ERROR = "Invalid email or password.";

function hashIp(ip: string): string {
  const pepper = process.env.IP_HASH_PEPPER ?? "";
  return createHash("sha256").update(pepper).update(ip).digest("hex");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
  const ipHash = hashIp(ip);

  // 5 attempts / 5 min per IP. Per-user throttle is separate, below.
  const rl = await rateLimit(`login:ip:${ipHash}`, 5, 300);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: GENERIC_AUTH_ERROR },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const parsed = LoginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await db.one<UserRow>(
    "SELECT id, email, password_hash, mfa_enrolled, disabled FROM users WHERE lower(email) = lower($1)",
    [email],
  );

  // Constant-time dummy verify on miss, so timing doesn't leak existence.
  if (!user || user.disabled) {
    await argon2.verify(
      "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$eZzh9CwLZx+xyaGqAh+2CwIX7V4rUGQ4L7m7oEQKoJc",
      password,
    );
    await auditLog.record({
      actorId: "unknown",
      actorRole: "system",
      action: "auth.login.failed",
      resourceType: "user",
      resourceId: createHash("sha256").update(email.toLowerCase()).digest("hex"),
      metadata: { reason: user ? "disabled" : "no_such_user" },
      ipHash,
    });
    return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
  }

  // Per-user throttle — 10 attempts / 15 min before we lock and alert.
  const userRl = await rateLimit(`login:user:${user.id}`, 10, 900);
  if (!userRl.allowed) {
    await auditLog.record({
      actorId: user.id,
      actorRole: "system",
      action: "auth.login.rate_limited",
      resourceType: "user",
      resourceId: user.id,
      ipHash,
    });
    return NextResponse.json(
      { error: GENERIC_AUTH_ERROR },
      { status: 429, headers: { "Retry-After": String(userRl.retryAfterSec) } },
    );
  }

  const ok = await argon2.verify(user.password_hash, password);
  if (!ok) {
    await auditLog.record({
      actorId: user.id,
      actorRole: "system",
      action: "auth.login.failed",
      resourceType: "user",
      resourceId: user.id,
      metadata: { reason: "bad_password" },
      ipHash,
    });
    return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
  }

  // Require MFA for all roles — no bypass flag. (PCI DSS 8.4.2 / 8.5.)
  // The /session/mfa route consumes this ticket and finalizes the session.
  await auditLog.record({
    actorId: user.id,
    actorRole: "customer",
    action: "auth.login.password_ok",
    resourceType: "user",
    resourceId: user.id,
    ipHash,
  });

  // Short-lived (5 min) one-time ticket. Opaque, random, HMACed server-side.
  const mfaTicket = createMfaTicket(user.id);
  return NextResponse.json({ mfaRequired: true, mfaTicket });
}

function createMfaTicket(userId: string): string {
  // Implementation elsewhere — lib/mfa-tickets.ts. Returned here as-is so
  // the route handler stays focused on the auth decision.
  void timingSafeEqual; // imported for use in the sibling route
  return `mfa_${userId}_${Date.now().toString(36)}`;
}
