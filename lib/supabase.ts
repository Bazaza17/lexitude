import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export type Framework = "SOC2" | "GDPR" | "HIPAA";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export type AuditRunRow = {
  id: string;
  created_at: string;
  company_name: string;
  framework: Framework;
  repo_url: string | null;
  repo_branch: string | null;
  file_count: number | null;
  doc_count: number | null;
  code_result: unknown;
  policy_result: unknown;
  risk_result: unknown;
  overall_score: number | null;
  risk_level: RiskLevel | null;
};
