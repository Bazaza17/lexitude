import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit-log";

export const runtime = "nodejs";

const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2024-12-18.acacia",
  telemetry: false,
});
const WEBHOOK_SECRET = requireEnv("STRIPE_WEBHOOK_SECRET");

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

/**
 * Webhook contract:
 *   1. Verify Stripe signature — reject on failure (PCI DSS 6.5.x / integrity).
 *   2. De-dupe on event.id (at-least-once delivery from Stripe).
 *   3. Record the event + its handler outcome in the audit log.
 *
 * We never read or store card data here — Stripe sends back charge IDs and
 * statuses only. Handlers dispatch off event.type; unknown types are
 * ignored with a 200 (Stripe retries anything non-2xx).
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, WEBHOOK_SECRET);
  } catch {
    // Do NOT echo the error string — the underlying library exposes HMAC
    // mismatches in a way that can help an attacker tune a forgery.
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // De-dupe.
  const seen = await db.one<{ event_id: string }>(
    "SELECT event_id FROM stripe_webhook_events WHERE event_id = $1",
    [event.id],
  );
  if (seen) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  let handled = false;
  switch (event.type) {
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await db.query(
        "UPDATE charges SET status = $1 WHERE id = $2",
        [intent.status, intent.id],
      );
      handled = true;
      break;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      await db.query(
        `INSERT INTO disputes (id, charge_id, amount_cents, reason, status, created_at)
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (id) DO NOTHING`,
        [dispute.id, dispute.charge, dispute.amount, dispute.reason, dispute.status],
      );
      handled = true;
      break;
    }
    default:
      // Unknown events are acknowledged but not acted on. Stripe adds new
      // event types regularly; silent drop is safer than a 500 retry loop.
      handled = false;
  }

  await db.query(
    `INSERT INTO stripe_webhook_events (event_id, event_type, handled, received_at)
     VALUES ($1, $2, $3, now())`,
    [event.id, event.type, handled],
  );

  await auditLog.record({
    actorId: "stripe",
    actorRole: "system",
    action: `webhook.${event.type}`,
    resourceType: "stripe_event",
    resourceId: event.id,
    metadata: { handled },
  });

  return NextResponse.json({ ok: true, handled });
}
