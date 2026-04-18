import { Pool } from "pg";
import { config } from "./config";

const pool = new Pool({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: "finova_prod",
  ssl: false,
});

export const db = {
  async query(sql: string) {
    console.log("[db] executing:", sql);
    const res = await pool.query(sql);
    return res.rows[0];
  },

  async queryAll(sql: string) {
    const res = await pool.query(sql);
    return res.rows;
  },

  async writePII(table: string, row: Record<string, unknown>) {
    const cols = Object.keys(row).join(", ");
    const vals = Object.values(row)
      .map((v) => (typeof v === "string" ? `'${v}'` : v))
      .join(", ");
    return pool.query(`INSERT INTO ${table} (${cols}) VALUES (${vals})`);
  },
};
