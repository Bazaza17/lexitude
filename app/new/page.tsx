"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import type { Framework } from "@/lib/types";
import { Logo } from "@/components/site/Logo";

type PendingAudit = {
  companyName: string;
  framework: Framework;
  repoUrl: string;
  repoPaths: string[];
  policyText: string;
  policyFiles: Array<{ name: string; text: string }>;
};

type Step = 0 | 1 | 2 | 3;

const FRAMEWORKS: {
  value: Framework;
  name: string;
  description: string;
  popular: boolean;
}[] = [
  {
    value: "SOC2",
    name: "SOC 2",
    description: "Trust Services Criteria — common for US SaaS.",
    popular: true,
  },
  {
    value: "HIPAA",
    name: "HIPAA",
    description: "Safeguards for protected health information (PHI).",
    popular: true,
  },
  {
    value: "GDPR",
    name: "GDPR",
    description: "EU data-protection and privacy obligations.",
    popular: true,
  },
];

export default function NewAuditPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);

  const [companyName, setCompanyName] = useState("FinovaBank");
  const [framework, setFramework] = useState<Framework>("SOC2");

  const [repoUrl, setRepoUrl] = useState("https://github.com/Bazaza17/lexitude");
  const [repoPaths, setRepoPaths] = useState("demo/finovabank/repo");

  const [policyText, setPolicyText] = useState("");
  const [policyFiles, setPolicyFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepValidation = (() => {
    if (step === 0 && !companyName.trim()) return "Company name is required.";
    if (step === 1 && !repoUrl.trim()) return "GitHub repo URL is required.";
    if (step === 2 && !policyText.trim() && policyFiles.length === 0)
      return "Provide at least one policy document (upload or paste).";
    return null;
  })();

  const next = () => {
    if (stepValidation) {
      setErr(stepValidation);
      return;
    }
    setErr(null);
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  };
  const back = () => {
    setErr(null);
    setStep((s) => (s > 0 ? ((s - 1) as Step) : s));
  };

  async function handleStart() {
    if (submitting) return;
    setErr(null);

    // final validation
    if (!companyName.trim()) return setErr("Company name is required.");
    if (!repoUrl.trim()) return setErr("GitHub repo URL is required.");
    if (!policyText.trim() && policyFiles.length === 0)
      return setErr("Provide at least one policy document.");

    setSubmitting(true);
    try {
      const files = await Promise.all(
        policyFiles.map(async (f) => ({ name: f.name, text: await f.text() })),
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
      sessionStorage.setItem("lexitude:pending", JSON.stringify(pending));
      router.push("/run");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-[0.25]" />
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "var(--gradient-radial)" }}
      />

      {/* Top bar */}
      <header className="relative border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-4xl items-center justify-between px-6 py-2">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="text-sm font-semibold tracking-tight">Lexitude</span>
          </Link>
          <Link
            href="/history"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Past runs →
          </Link>
        </div>
      </header>

      <div className="relative mx-auto max-w-4xl px-6 py-10">
        {/* Progress */}
        <div className="mb-10 flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] ${
                  i <= step
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-muted-foreground"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              {i < 3 && (
                <div
                  className={`h-px flex-1 ${i < step ? "bg-foreground" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-surface/40 p-8">
          {step === 0 && (
            <StepCompany
              companyName={companyName}
              setCompanyName={setCompanyName}
              framework={framework}
              setFramework={setFramework}
            />
          )}
          {step === 1 && (
            <StepCode
              repoUrl={repoUrl}
              setRepoUrl={setRepoUrl}
              repoPaths={repoPaths}
              setRepoPaths={setRepoPaths}
            />
          )}
          {step === 2 && (
            <StepPolicy
              policyText={policyText}
              setPolicyText={setPolicyText}
              policyFiles={policyFiles}
              setPolicyFiles={setPolicyFiles}
              fileInputRef={fileInputRef}
            />
          )}
          {step === 3 && (
            <StepReview
              companyName={companyName}
              framework={framework}
              repoUrl={repoUrl}
              repoPaths={repoPaths}
              policyFiles={policyFiles}
              policyText={policyText}
            />
          )}
        </div>

        {err && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {err}
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            onClick={back}
            disabled={step === 0}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            ← Back
          </button>

          {step < 3 ? (
            <button
              onClick={next}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Continue
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M4 2l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={submitting}
              aria-busy={submitting}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="animate-spin"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="40 20"
                    />
                  </svg>
                  Starting audit…
                </>
              ) : (
                <>
                  Run audit
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 2l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepHeader({
  tag,
  title,
  subtitle,
}: {
  tag: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-8">
      <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        — {tag}
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function StepCompany({
  companyName,
  setCompanyName,
  framework,
  setFramework,
}: {
  companyName: string;
  setCompanyName: (s: string) => void;
  framework: Framework;
  setFramework: (f: Framework) => void;
}) {
  const companyId = useId();
  return (
    <div>
      <StepHeader
        tag="Step 1"
        title="Company & framework"
        subtitle="We'll use these to scope the audit and phrase the findings."
      />
      <div className="space-y-6">
        <div>
          <label
            htmlFor={companyId}
            className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            Company name
          </label>
          <input
            id={companyId}
            name="company"
            type="text"
            autoComplete="organization"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="FinovaBank"
            className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div>
          <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Framework
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FRAMEWORKS.map((f) => {
              const active = framework === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFramework(f.value)}
                  className={`flex min-h-11 flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors ${
                    active
                      ? "border-foreground bg-surface-elevated"
                      : "border-border bg-surface hover:bg-surface-elevated"
                  }`}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <div className="text-sm font-medium text-foreground">{f.name}</div>
                    <div
                      aria-hidden="true"
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        active ? "border-foreground bg-foreground" : "border-border"
                      }`}
                    >
                      {active && (
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6l3 3 5-6"
                            stroke="var(--background)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCode({
  repoUrl,
  setRepoUrl,
  repoPaths,
  setRepoPaths,
}: {
  repoUrl: string;
  setRepoUrl: (s: string) => void;
  repoPaths: string;
  setRepoPaths: (s: string) => void;
}) {
  const urlId = useId();
  const pathsId = useId();
  return (
    <div>
      <StepHeader
        tag="Step 2"
        title="Code source"
        subtitle="Point Lexitude at a GitHub repository. We'll fetch the tree server-side — no cloning."
      />
      <div className="space-y-6">
        <div>
          <label
            htmlFor={urlId}
            className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            GitHub repo URL
          </label>
          <input
            id={urlId}
            name="repoUrl"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="https://github.com/owner/repo"
          />
        </div>
        <div>
          <label
            htmlFor={pathsId}
            className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            Paths (optional)
          </label>
          <input
            id={pathsId}
            name="repoPaths"
            value={repoPaths}
            onChange={(e) => setRepoPaths(e.target.value)}
            className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="src, lib"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Comma or newline separated. Leave blank to scan the whole repo.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
            FinovaBank demo
          </div>
          <p className="text-sm text-muted-foreground">
            The pre-loaded values point at the FinovaBank demo on this repo — nine
            files containing layered compliance landmines (hardcoded secrets, PII
            in logs, auth bypass, injection vectors, AI-governance gaps).
          </p>
        </div>
      </div>
    </div>
  );
}

function StepPolicy({
  policyText,
  setPolicyText,
  policyFiles,
  setPolicyFiles,
  fileInputRef,
}: {
  policyText: string;
  setPolicyText: (s: string) => void;
  policyFiles: File[];
  setPolicyFiles: (f: File[]) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const uploadId = useId();
  const textId = useId();
  return (
    <div>
      <StepHeader
        tag="Step 3"
        title="Policy documents"
        subtitle="Drop in PDFs, markdown, or paste raw text. Lexitude will cross-reference every clause with your code."
      />

      <div className="space-y-6">
        <div>
          <label
            htmlFor={uploadId}
            className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            Upload files
          </label>
          <input
            ref={fileInputRef}
            id={uploadId}
            type="file"
            multiple
            accept=".pdf,.md,.txt,.markdown"
            onChange={(e) => setPolicyFiles(Array.from(e.target.files ?? []))}
            className="block w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:opacity-90"
          />
          {policyFiles.length > 0 && (
            <div className="mt-3 space-y-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
              {policyFiles.map((f) => (
                <div key={f.name}>
                  <span className="text-foreground">{f.name}</span> · {(f.size / 1024).toFixed(1)}KB
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            PDF, Markdown, or plain text. Try{" "}
            <code className="font-mono text-[11px]">demo/finovabank/policies/*.md</code>{" "}
            from this repo.
          </p>
        </div>

        <div>
          <label
            htmlFor={textId}
            className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            Or paste policy text
          </label>
          <textarea
            id={textId}
            value={policyText}
            onChange={(e) => setPolicyText(e.target.value)}
            className="min-h-32 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Paste handbook, privacy policy, AI usage policy…"
          />
        </div>
      </div>
    </div>
  );
}

function StepReview({
  companyName,
  framework,
  repoUrl,
  repoPaths,
  policyFiles,
  policyText,
}: {
  companyName: string;
  framework: Framework;
  repoUrl: string;
  repoPaths: string;
  policyFiles: File[];
  policyText: string;
}) {
  const paths = repoPaths
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const docCount = policyFiles.length + (policyText.trim() ? 1 : 0);

  return (
    <div>
      <StepHeader
        tag="Step 4"
        title="Ready to run"
        subtitle="Three Claude modules will run in sequence — code, policy, and risk — streaming live."
      />

      <div className="space-y-3">
        <ReviewRow label="Company" value={companyName || "—"} />
        <ReviewRow label="Framework" value={framework} mono />
        <ReviewRow label="Repository" value={repoUrl} mono />
        <ReviewRow
          label="Paths"
          value={paths.length > 0 ? paths.join(" · ") : "whole repo"}
          mono
        />
        <ReviewRow
          label="Policy sources"
          value={
            docCount === 0
              ? "None"
              : [
                  policyFiles.length > 0 &&
                    `${policyFiles.length} file${policyFiles.length > 1 ? "s" : ""}`,
                  policyText.trim() && "pasted text",
                ]
                  .filter(Boolean)
                  .join(" · ")
          }
        />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-background p-4">
        <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
          What happens next
        </div>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>1. We fetch the repo and parse the policy documents.</li>
          <li>
            2. Module 1 scores your code against {framework}. Module 2 reads
            policies and flags gaps. Module 3 cross-references code vs policy.
          </li>
          <li>
            3. The run is saved. You get a dashboard with findings, insights,
            and priority actions.
          </li>
        </ul>
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className={`max-w-[60%] truncate text-right text-sm text-foreground ${mono ? "font-mono" : ""}`}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
