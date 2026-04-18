"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { frameworkDisplayName, type Framework } from "@/lib/types";
import { Logo } from "@/components/site/Logo";
import { getScenario } from "@/lib/demo-scenarios";

function readScenarioIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const sp = new URLSearchParams(window.location.search);
  return sp.get("scenario");
}

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
  {
    value: "ISO27001",
    name: "ISO 27001",
    description: "ISO/IEC 27001:2022 ISMS — Annex A controls.",
    popular: false,
  },
  {
    value: "PCIDSS",
    name: "PCI DSS",
    description: "PCI DSS v4.0 — for anyone touching cardholder data.",
    popular: false,
  },
];

export default function NewAuditPage() {
  const router = useRouter();
  // Read the scenario id from the URL at module time (client-only). Avoids the
  // useSearchParams Suspense requirement — this page is already "use client"
  // and never SSR-hydrated with a scenario prefill.
  const initialScenarioId =
    typeof window !== "undefined" ? readScenarioIdFromUrl() : null;
  const initial = initialScenarioId ? getScenario(initialScenarioId) : undefined;

  const [step, setStep] = useState<Step>(0);

  const [companyName, setCompanyName] = useState(
    initial?.companyName ?? "FinovaBank",
  );
  const [framework, setFramework] = useState<Framework>(
    initial?.framework ?? "SOC2",
  );

  const [repoUrl, setRepoUrl] = useState(
    initial?.repoUrl ?? "https://github.com/Bazaza17/lexitude",
  );
  const [repoPaths, setRepoPaths] = useState(
    initial?.repoPaths ?? "demo/finovabank/repo",
  );

  const [policyText, setPolicyText] = useState(initial?.policyText ?? "");
  const [policyFiles, setPolicyFiles] = useState<File[]>([]);
  // Auto-discovered policy docs pulled straight from the repo tree. Kept
  // separate from user uploads so the UI can show them differently and so a
  // re-run of discovery replaces the set cleanly.
  const [discoveredDocs, setDiscoveredDocs] = useState<
    Array<{ path: string; name: string; text: string }>
  >([]);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-seed if the URL scenario param changed after mount (e.g. user clicks
  // another scenario link while still on /new). initialScenarioId isn't
  // available during SSR, so this effect handles the client-side hydration
  // case and subsequent pushes.
  const appliedScenario = useRef<string | null>(initial?.id ?? null);
  useEffect(() => {
    const id = readScenarioIdFromUrl();
    if (!id) return;
    if (appliedScenario.current === id) return;
    const s = getScenario(id);
    if (!s) return;
    appliedScenario.current = id;
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot scenario prefill, guarded by ref so no re-fire */
    setCompanyName(s.companyName);
    setFramework(s.framework);
    setRepoUrl(s.repoUrl);
    setRepoPaths(s.repoPaths);
    setPolicyText(s.policyText);
    setStep(0);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const stepValidation = (() => {
    if (step === 0 && !companyName.trim()) return "Company name is required.";
    if (step === 1 && !repoUrl.trim()) return "GitHub repo URL is required.";
    // Step 2 (policies) is optional — empty triggers the no-docs inference mode.
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

    // final validation — policies are optional; empty triggers no-docs inference
    if (!companyName.trim()) return setErr("Company name is required.");
    if (!repoUrl.trim()) return setErr("GitHub repo URL is required.");

    setSubmitting(true);
    try {
      const files = await Promise.all(
        policyFiles.map(async (f) => ({ name: f.name, text: await f.text() })),
      );
      // Merge auto-discovered repo docs into the same bundle — the downstream
      // pipeline doesn't care where a doc came from, only that it parses.
      const mergedFiles = [
        ...files,
        ...discoveredDocs.map((d) => ({ name: d.path, text: d.text })),
      ];
      const pending: PendingAudit = {
        companyName: companyName.trim(),
        framework,
        repoUrl: repoUrl.trim(),
        repoPaths: repoPaths
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
        policyText: policyText.trim(),
        policyFiles: mergedFiles,
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
        {/* Progress — dots are clickable to jump between visited steps */}
        <div className="mb-10 flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => {
            const reachable = i <= step;
            return (
              <div key={i} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (reachable) {
                      setErr(null);
                      setStep(i as Step);
                    }
                  }}
                  disabled={!reachable}
                  aria-label={`Go to step ${i + 1}`}
                  aria-current={i === step ? "step" : undefined}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] transition-all disabled:pointer-events-none ${
                    i <= step
                      ? "border-foreground bg-foreground text-background hover:scale-110"
                      : "border-border bg-surface text-muted-foreground opacity-60"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </button>
                {i < 3 && (
                  <div
                    className={`h-px flex-1 ${i < step ? "bg-foreground" : "bg-border"}`}
                  />
                )}
              </div>
            );
          })}
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
              discoveredDocs={discoveredDocs}
              setDiscoveredDocs={setDiscoveredDocs}
              repoUrl={repoUrl}
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
              discoveredDocs={discoveredDocs}
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
            type="button"
            onClick={back}
            disabled={step === 0}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            ← Back
          </button>

          {step < 3 ? (
            <button
              type="button"
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
              type="button"
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
  discoveredDocs,
  setDiscoveredDocs,
  repoUrl,
  fileInputRef,
}: {
  policyText: string;
  setPolicyText: (s: string) => void;
  policyFiles: File[];
  setPolicyFiles: (f: File[]) => void;
  discoveredDocs: Array<{ path: string; name: string; text: string }>;
  setDiscoveredDocs: (
    d: Array<{ path: string; name: string; text: string }>,
  ) => void;
  repoUrl: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const uploadId = useId();
  const textId = useId();
  const [discovering, setDiscovering] = useState(false);
  const [discoverErr, setDiscoverErr] = useState<string | null>(null);
  const [discoverStatus, setDiscoverStatus] = useState<string | null>(null);

  async function runAutoDiscover() {
    if (discovering) return;
    setDiscoverErr(null);
    setDiscoverStatus(null);
    if (!repoUrl.trim()) {
      setDiscoverErr("Set a GitHub repo URL in step 2 first.");
      return;
    }
    setDiscovering(true);
    try {
      const res = await fetch("/api/policies/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Discovery failed");
      const docs = Array.isArray(json.docs) ? json.docs : [];
      setDiscoveredDocs(
        docs.map((d: { path: string; name: string; text: string }) => ({
          path: d.path,
          name: d.name,
          text: d.text,
        })),
      );
      setDiscoverStatus(
        docs.length === 0
          ? "No policy-like documents found in the repo. You can still upload, paste, or continue without docs."
          : `Found ${docs.length} policy document${docs.length === 1 ? "" : "s"} in the repo.`,
      );
    } catch (e) {
      setDiscoverErr(e instanceof Error ? e.message : String(e));
    } finally {
      setDiscovering(false);
    }
  }

  const hasAnyDoc =
    policyFiles.length > 0 || discoveredDocs.length > 0 || !!policyText.trim();

  return (
    <div>
      <StepHeader
        tag="Step 3"
        title="Policy documents"
        subtitle="Drop in PDFs, markdown, or paste raw text. Lexitude will cross-reference every clause with your code."
      />

      {/* No-policies hero — first-class path for companies that don't have
          written policies yet. Tells the user skipping is supported and
          explains what happens. */}
      {!hasAnyDoc && (
        <div className="mb-6 rounded-lg border border-dashed border-border bg-background p-4">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
            No policies yet?
          </div>
          <p className="text-sm text-muted-foreground">
            Continue without uploading. Lexitude will generate the full
            required-policy gap list from your code findings and framework
            requirements — and draft any missing policy inline once the audit
            finishes.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Auto-discover + connectors */}
        <div className="rounded-lg border border-border bg-surface/40 p-4">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Pull from a source
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runAutoDiscover}
              disabled={discovering || !repoUrl.trim()}
              className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:pointer-events-none disabled:opacity-50"
            >
              {discovering ? (
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
                  Scanning repo…
                </>
              ) : (
                <>
                  <span aria-hidden="true">⎇</span>
                  Auto-discover from repo
                </>
              )}
            </button>
            <ConnectorStub label="Notion" />
            <ConnectorStub label="Google Drive" />
            <ConnectorStub label="Confluence" />
            <ConnectorStub label="SharePoint" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Auto-discover scans your repo for <code className="font-mono">SECURITY.md</code>,{" "}
            <code className="font-mono">PRIVACY.md</code>,{" "}
            <code className="font-mono">docs/compliance/</code>, and other
            conventional policy locations. Connectors coming soon.
          </p>

          {discoverStatus && (
            <div className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
              {discoverStatus}
            </div>
          )}
          {discoverErr && (
            <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {discoverErr}
            </div>
          )}

          {discoveredDocs.length > 0 && (
            <div className="mt-3 space-y-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
              {discoveredDocs.map((d) => (
                <div
                  key={d.path}
                  className="flex items-center justify-between gap-2"
                >
                  <span>
                    <span className="text-foreground">{d.path}</span> ·{" "}
                    {(d.text.length / 1024).toFixed(1)}KB
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDiscoveredDocs(
                        discoveredDocs.filter((x) => x.path !== d.path),
                      )
                    }
                    aria-label={`Remove ${d.path}`}
                    className="cursor-pointer text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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

function ConnectorStub({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      title={`${label} connector coming soon`}
      className="inline-flex min-h-9 cursor-not-allowed items-center gap-1.5 rounded-md border border-dashed border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground opacity-70"
    >
      <span aria-hidden="true">◦</span>
      {label}
      <span className="ml-1 rounded-sm border border-border px-1 py-[1px] font-mono text-[9px] uppercase tracking-wider">
        soon
      </span>
    </button>
  );
}

function StepReview({
  companyName,
  framework,
  repoUrl,
  repoPaths,
  policyFiles,
  discoveredDocs,
  policyText,
}: {
  companyName: string;
  framework: Framework;
  repoUrl: string;
  repoPaths: string;
  policyFiles: File[];
  discoveredDocs: Array<{ path: string; name: string; text: string }>;
  policyText: string;
}) {
  const paths = repoPaths
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const docCount =
    policyFiles.length +
    discoveredDocs.length +
    (policyText.trim() ? 1 : 0);
  const noDocs = docCount === 0;

  return (
    <div>
      <StepHeader
        tag="Step 4"
        title="Ready to run"
        subtitle={
          noDocs
            ? "Three Claude modules will run — code, policy inference (no docs provided), and risk — streaming live."
            : "Three Claude modules will run — code, policy, and risk — streaming live."
        }
      />

      <div className="space-y-3">
        <ReviewRow label="Company" value={companyName || "—"} />
        <ReviewRow label="Framework" value={frameworkDisplayName(framework)} mono />
        <ReviewRow label="Repository" value={repoUrl} mono />
        <ReviewRow
          label="Paths"
          value={paths.length > 0 ? paths.join(" · ") : "whole repo"}
          mono
        />
        <ReviewRow
          label="Policy sources"
          value={
            noDocs
              ? "None — will infer required policies from code + framework"
              : [
                  policyFiles.length > 0 &&
                    `${policyFiles.length} upload${policyFiles.length > 1 ? "s" : ""}`,
                  discoveredDocs.length > 0 &&
                    `${discoveredDocs.length} from repo`,
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
          <li>
            1. We fetch the repo{noDocs ? "" : " and parse the policy documents"}.
          </li>
          <li>
            2. Module 1 scores your code against {frameworkDisplayName(framework)}.{" "}
            {noDocs
              ? "Module 2 infers the full required-policy set from your code and framework. "
              : "Module 2 reads policies and flags gaps. "}
            Module 3 cross-references code vs policy.
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
