import Link from "next/link";

export function CTA() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-30" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--gradient-radial)" }}
      />

      <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Stop assuming your policy matches your code.
          <br />
          <span className="text-muted-foreground">Prove it.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-muted-foreground">
          Run a full audit — code, policy, and cross-reference — in under five minutes.
          The FinovaBank demo is pre-loaded.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start an audit
          </Link>
          <Link
            href="/history"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated"
          >
            See past runs
          </Link>
        </div>
      </div>
    </section>
  );
}
