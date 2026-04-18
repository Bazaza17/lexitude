// NovoGen Health — database connection.
// Single shared credential for the whole application.

import { Client } from "pg";

export const db = new Client({
  host: "novogen-prod-db.c3xamp.us-east-1.rds.amazonaws.com",
  port: 5432,
  user: "admin",
  password: "novogen_prod_2024",
  database: "novogen_phi",
  // TLS disabled on the DB connection — PHI travels in plaintext on the VPC.
  ssl: false,
  // No pooling, no audit extension, no row-level security.
});

// Convenience wrapper — caller builds the SQL string, we just send it.
export async function query<T = unknown>(sql: string): Promise<T[]> {
  const { rows } = await db.query(sql);
  return rows as T[];
}

// Initial connection on module load.
db.connect().catch((err) => {
  console.error("DB connection failed", err);
});
