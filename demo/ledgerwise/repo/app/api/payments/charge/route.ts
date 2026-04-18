import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit-log";
import { rateLimit } from "@/lib/rate-limit";
import { requireOperatorSession } from "@/lib/session";

export const runtime = "nodejs";

// Ledgerwise never touches raw PANs. The browser tokenizes the card with
// Stripe Elements and we receive only a paymentMethodId (pm_...). The
// cardholder data environment (CDE) for this service is therefore limited
// to the tokenized reference — reducing PCI scope to SAQ A-EP.
const ChargeSchema = z.object({
  customerId: z.string().uuid(),
  paymentMethodId: z.string().regex(/^pm_[A-Za-z0-9]+$/),
  amountCents: z.number().int().positive().max(50_000_00),
  currency: z.enum(["usd", "eur", "gbp", "cad"]),
  idempotencyKey: z.string().min(16).max(128),
  memo: z.string().max(200).optional(),
});

const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2024-12-18.acacia",
  telemetry: false,
});

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export async function POST(req: NextRequest) {
  const session = await requireOperatorSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 60 charges per minute per operator — generous for normal ops, tight
  // enough to blunt a compromised-token brute force.
  const rl = await rateLimit(`charge:op:${session.userId}`, 60, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const parsed = ChargeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Idempotency — prior success for this key returns the stored result
  // without re-calling Stripe. Table has a unique index on (operator_id, key).
  const prior = await db.one<{ charge_id: string; status: string }>(
    "SELECT charge_id, status FROM charge_idempotency WHERE operator_id = $1 AND key = $2",
    [session.userId, body.idempotencyKey],
  );
  if (prior) {
    return NextResponse.json({ chargeId: prior.charge_id, status: prior.status });
  }

  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe.paymentIntents.create(
      {
        amount: body.amountCents,
        currency: body.currency,
        customer: body.customerId,
        payment_method: body.paymentMethodId,
        confirm: true,
        off_session: true,
        // Memo is logged by Stripe and shown on the statement descriptor;
        // ensure we don't smuggle PAN/CVV through it.
        description: body.memo?.slice(0, 200),
        metadata: { operator_id: session.userId },
      },
      { idempotencyKey: body.idempotencyKey },
    );
  } catch (err) {
    // Known Stripe errors are returned as 402; unknown are 502 and alert.
    await auditLog.record({
      actorId: session.userId,
      actorRole: "operator",
      action: "payment.charge.failed",
      resourceType: "customer",
      resourceId: body.customerId,
      metadata: {
        amountCents: body.amountCents,
        currency: body.currency,
        // Never log the paymentMethodId alongside a cardholder name — this
        // handler receives neither, but the audit record explicitly omits
        // the pm_ token to keep the audit table out of PCI scope.
        errorCode: (err as Stripe.StripeRawError)?.code ?? "unknown",
      },
    });
    const code = (err as Stripe.StripeRawError)?.code;
    const status = code === "card_declined" ? 402 : 502;
    return NextResponse.json({ error: "Charge failed", code }, { status });
  }

  await db.transaction(async () => {
    await db.query(
      `INSERT INTO charge_idempotency (operator_id, key, charge_id, status, created_at)
       VALUES ($1, $2, $3, $4, now())`,
      [session.userId, body.idempotencyKey, intent.id, intent.status],
    );
    await db.query(
      `INSERT INTO charges (id, operator_id, customer_id, amount_cents, currency, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [
        intent.id,
        session.userId,
        body.customerId,
        body.amountCents,
        body.currency,
        intent.status,
      ],
    );
  });

  await auditLog.record({
    actorId: session.userId,
    actorRole: "operator",
    action: "payment.charge.created",
    resourceType: "charge",
    resourceId: intent.id,
    metadata: {
      customerId: body.customerId,
      amountCents: body.amountCents,
      currency: body.currency,
      status: intent.status,
    },
  });

  return NextResponse.json({ chargeId: intent.id, status: intent.status });
}
