// NovoGen Health — lab result ingestion
// Called by Quest/LabCorp webhooks. Writes PHI directly into the patients table.

import { db } from "@/lib/db";

type LabPayload = {
  patientId: string;
  test: string;
  result: string;
  raw: string;
  source: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as LabPayload;

  // patientId concatenated into SQL directly — no parameterization.
  await db.query(
    `INSERT INTO lab_results (patient_id, test, result, raw, source, received_at)
     VALUES ('${body.patientId}', '${body.test}', '${body.result}',
             '${body.raw}', '${body.source}', NOW())`,
  );

  // No audit trail entry. HIPAA §164.312(b) requires logging who modified what.

  return Response.json({ ok: true });
}
