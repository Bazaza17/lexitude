import { Pool, type QueryResult, type QueryResultRow } from "pg";

// Connection is driven entirely by DATABASE_URL (secrets manager → env).
// No credentials in source. TLS is required — we reject plaintext
// connections in production.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: true }
      : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  statement_timeout: 5_000,
});

/**
 * Thin wrapper around pg. The contract is: callers always pass a
 * parameterized statement + values array. String interpolation into SQL is
 * forbidden (ESLint rule `no-restricted-syntax` in the main repo flags it).
 *
 * We never log the SQL text or its parameters — pg statement logs can leak
 * PAN, email, and other sensitive data into stdout. The caller logs the
 * business-level audit event via `auditLog.record()` instead.
 */
export const db = {
  async query<R extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: ReadonlyArray<unknown> = [],
  ): Promise<QueryResult<R>> {
    return pool.query<R>(sql, params as unknown[]);
  },

  async one<R extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: ReadonlyArray<unknown> = [],
  ): Promise<R | null> {
    const res = await pool.query<R>(sql, params as unknown[]);
    return res.rows[0] ?? null;
  },

  async transaction<T>(fn: (tx: Pool) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const out = await fn(pool);
      await client.query("COMMIT");
      return out;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};
