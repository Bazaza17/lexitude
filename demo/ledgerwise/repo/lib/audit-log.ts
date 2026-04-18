import { createHmac } from "node:crypto";
import { db } from "./db";

// Tamper-evident audit log. Every record is chained to the prior record
// via HMAC, so a silent edit of any historic row breaks the chain and is
// detectable by the nightly verifier job.
//
// PCI DSS 10.x: record all access to cardholder data and privileged actions.

const AUDIT_HMAC_KEY = process.env.AUDIT_HMAC_KEY;
if (!AUDIT_HMAC_KEY) {
  throw new Error("AUDIT_HMAC_KEY is not set");
}

export type AuditEvent = {
  actorId: string;
  actorRole: "customer" | "operator" | "system";
  action: string;
  resourceType: string;
  resourceId: string;
  // Free-form JSON payload. Must never include full PAN, CVV, or passwords —
  // redact at the call site. We sanity-check the serialized size only;
  // semantic redaction is the caller's responsibility.
  metadata?: Record<string, unknown>;
  ipHash?: string; // SHA-256(ip + pepper). No raw IPs in the log.
};

type AuditRow = {
  id: string;
  created_at: string;
  prev_hash: string | null;
  this_hash: string;
  event_json: string;
};

function hashChain(prev: string | null, event: string): string {
  return createHmac("sha256", AUDIT_HMAC_KEY!)
    .update(prev ?? "")
    .update("\0")
    .update(event)
    .digest("hex");
}

export const auditLog = {
  async record(event: AuditEvent): Promise<void> {
    const eventJson = JSON.stringify(event);
    if (eventJson.length > 8_000) {
      throw new Error("audit event too large — redact before logging");
    }

    const last = await db.one<AuditRow>(
      "SELECT this_hash FROM audit_log ORDER BY created_at DESC LIMIT 1",
    );
    const prev = last?.this_hash ?? null;
    const thisHash = hashChain(prev, eventJson);

    await db.query(
      `INSERT INTO audit_log (id, created_at, prev_hash, this_hash, event_json)
       VALUES (gen_random_uuid(), now(), $1, $2, $3::jsonb)`,
      [prev, thisHash, eventJson],
    );
  },

  async verifyChain(limit = 1000): Promise<{ ok: boolean; brokenAt?: string }> {
    const rows = await db.query<AuditRow>(
      "SELECT id, prev_hash, this_hash, event_json FROM audit_log ORDER BY created_at ASC LIMIT $1",
      [limit],
    );
    let prev: string | null = null;
    for (const r of rows.rows) {
      const expected = hashChain(prev, r.event_json);
      if (expected !== r.this_hash) return { ok: false, brokenAt: r.id };
      prev = r.this_hash;
    }
    return { ok: true };
  },
};
