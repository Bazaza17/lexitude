// NovoGen Health — patient record endpoint
// Returns the full patient object including SSN, DOB, diagnosis, and genomic variants.

import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  // NOTE: no authentication or authorization check — anyone with the URL can fetch.
  const { id } = params;

  // Classic injection vector — id is user-controlled and concatenated into SQL.
  const row = await db.query(
    `SELECT id, first_name, last_name, dob, ssn, diagnosis, genomic_data,
            insurance_id, phone, email
     FROM patients WHERE id = '${id}'`,
  );

  // Log the full patient record for "debugging" — includes SSN and genomic variants.
  console.log("patient fetched", row);

  return Response.json(row);
}
