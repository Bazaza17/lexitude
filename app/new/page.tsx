"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, FormEvent } from "react";
import type { Framework } from "@/lib/types";

type PendingAudit = {
  companyName: string;
  framework: Framework;
  repoUrl: string;
  repoPaths: string[];
  policyText: string;
  policyFiles: Array<{ name: string; text: string }>;
};

const FRAMEWORKS: { value: Framework; label: string; blurb: string }[] = [
  { value: "SOC2", label: "SOC 2", blurb: "Trust Services Criteria (CC, A, C, PI, P)" },
  { value: "GDPR", label: "GDPR", blurb: "EU 2016/679" },
  { value: "HIPAA", label: "HIPAA", blurb: "45 CFR §§160, 162, 164" },
];

export default function NewAuditPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("FinovaBank");
  const [framework, setFramework] = useState<Framework>("SOC2");
  const [repoUrl, setRepoUrl] = useState("https://github.com/Bazaza17/auditai");
  const [repoPaths, setRepoPaths] = useState("demo/finovabank/repo");
  const [policyText, setPolicyText] = useState("");
  const [policyFiles, setPolicyFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!companyName.trim()) {
      setErr("Company name is required.");
      return;
    }
    if (!repoUrl.trim()) {
      setErr("Repository URL is required.");
      return;
    }
    if (!policyText.trim() && policyFiles.length === 0) {
      setErr("Provide at least one policy document (upload or paste).");
      return;
    }

    setSubmitting(true);
    try {
      const files = await Promise.all(
        policyFiles.map(async (f) => ({
          name: f.name,
          text: await f.text(),
        })),
      );

      const pending: PendingAudit = {
        companyName: companyName.trim(),
        framework,
        repoUrl: repoUrl.trim(),
        repoPaths: repoPaths
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
        policyText: policyText.trim(),
        policyFiles: files,
      };

      sessionStorage.setItem("auditai:pending", JSON.stringify(pending));
      router.push("/run");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  function loadFinovaBankDemo() {
    setCompanyName("FinovaBank");
    setFramework("SOC2");
    setRepoUrl("https://github.com/Bazaza17/auditai");
    setRepoPaths("demo/finovabank/repo");
    setPolicyText(
      "Tip: upload demo/finovabank/policies/*.md from the repo — or paste any policy here.",
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          Start an audit
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Configure your audit
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Three modules will run against the inputs you provide. Nothing is
          stored except the final scores and findings.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <Field label="Company name" hint="Shown on the report.">
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="input"
            placeholder="Acme Corp"
          />
        </Field>

        <Field label="Framework" hint="Regulatory scope for the audit.">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {FRAMEWORKS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFramework(f.value)}
                className={`border px-4 py-3 text-left transition-colors ${
                  framework === f.value
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-zinc-300 hover:border-black dark:border-zinc-700 dark:hover:border-white"
                }`}
              >
                <div className="text-sm font-semibold">{f.label}</div>
                <div
                  className={`mt-1 text-xs ${
                    framework === f.value
                      ? "text-zinc-300 dark:text-zinc-600"
                      : "text-zinc-500"
                  }`}
                >
                  {f.blurb}
                </div>
              </button>
            ))}
          </div>
        </Field>

        <div className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            Code source
          </p>
          <div className="mt-4 space-y-4">
            <Field label="GitHub repo URL">
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="input"
                placeholder="https://github.com/owner/repo"
              />
            </Field>
            <Field
              label="Paths (optional)"
              hint="Comma or newline separated. Leave blank to scan the whole repo."
            >
              <input
                value={repoPaths}
                onChange={(e) => setRepoPaths(e.target.value)}
                className="input font-mono text-sm"
                placeholder="src, lib"
              />
            </Field>
          </div>
        </div>

        <div className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            Policy documents
          </p>
          <div className="mt-4 space-y-4">
            <Field label="Upload files" hint="PDF, Markdown, or plain text.">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.md,.txt,.markdown"
                onChange={(e) =>
                  setPolicyFiles(Array.from(e.target.files ?? []))
                }
                className="block w-full text-sm file:mr-3 file:border-0 file:bg-black file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-zinc-800 dark:file:bg-white dark:file:text-black dark:hover:file:bg-zinc-200"
              />
              {policyFiles.length > 0 && (
                <div className="mt-2 space-y-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  {policyFiles.map((f) => (
                    <div key={f.name}>
                      {f.name} · {(f.size / 1024).toFixed(1)}KB
                    </div>
                  ))}
                </div>
              )}
            </Field>
            <Field
              label="Or paste policy text"
              hint="Used in addition to any uploaded files."
            >
              <textarea
                value={policyText}
                onChange={(e) => setPolicyText(e.target.value)}
                className="input min-h-32"
                placeholder="Paste handbook, privacy policy, AI usage policy…"
              />
            </Field>
          </div>
        </div>

        {err && (
          <div className="border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {err}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <button
            type="button"
            onClick={loadFinovaBankDemo}
            className="text-xs font-mono uppercase tracking-widest text-zinc-500 hover:text-black dark:hover:text-white"
          >
            ↩ Load FinovaBank demo
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center bg-black px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {submitting ? "Starting…" : "Run audit →"}
          </button>
        </div>
      </form>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border: 1px solid rgb(212 212 216);
          background: transparent;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        :global(.input:focus) {
          border-color: black;
        }
        :global(.dark .input) {
          border-color: rgb(63 63 70);
        }
        :global(.dark .input:focus) {
          border-color: white;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint && (
          <span className="text-xs text-zinc-500 dark:text-zinc-500">
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}
