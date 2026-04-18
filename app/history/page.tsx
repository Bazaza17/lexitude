"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Framework, RiskLevel } from "@/lib/types";

type RunSummary = {
  id: string;
  created_at: string;
  company_name: string;
  framework: Framework;
  overall_score: number | null;
  risk_level: RiskLevel | null;
  file_count: number | null;
  doc_count: number | null;
};

export default function HistoryPage() {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/audit/runs");
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load runs");
        setRuns(json.runs ?? []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            History
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Past audits
          </h1>
        </div>
        <Link
          href="/new"
          className="bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          New audit
        </Link>
      </div>

      {err && (
        <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
      )}

      {runs && runs.length === 0 && (
        <p className="text-sm text-zinc-500">
          No audits yet.{" "}
          <Link href="/new" className="underline">
            Start one
          </Link>
          .
        </p>
      )}

      {runs && runs.length > 0 && (
        <div className="border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950">
              <tr className="font-mono text-xs uppercase tracking-widest text-zinc-500">
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Framework</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Risk</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.company_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.framework}</td>
                  <td className="px-4 py-3 text-lg font-semibold">
                    {r.overall_score ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.risk_level && (
                      <span
                        className={`px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                          {
                            critical: "bg-red-600 text-white",
                            high: "bg-orange-500 text-white",
                            medium: "bg-yellow-500 text-black",
                            low: "bg-emerald-500 text-white",
                          }[r.risk_level]
                        }`}
                      >
                        {r.risk_level}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/run/${r.id}`}
                      className="font-mono text-xs uppercase tracking-widest hover:underline"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
