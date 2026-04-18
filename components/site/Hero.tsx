"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { DashboardMock } from "./DashboardMock";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35]" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--gradient-radial)" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{ background: "var(--gradient-fade)" }}
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <div className="flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[11px] text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/80" />
            SOC 2 · GDPR · HIPAA · ISO 27001 · PCI DSS · AI readiness
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-gradient text-balance text-5xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-[64px] lg:leading-[1.02]"
          >
            The audit your written policy doesn&apos;t tell you about.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-5 max-w-md text-balance text-base leading-relaxed text-muted-foreground"
          >
            Lexitude reads your code, reads your policies, and surfaces the gaps
            between what you wrote down and what your systems actually do. In
            minutes, not quarters.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/new"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Start an audit
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M4 2l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link
              href="/history"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated"
            >
              <span className="font-mono text-xs text-muted-foreground">→</span>
              View past runs
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            <span>One-click demos</span>
            <span className="h-px flex-1 bg-border" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-3 grid gap-3 sm:grid-cols-3"
          >
            <Link
              href="/new?scenario=finovabank"
              className="group block rounded-lg border border-border bg-surface/60 p-3 transition-colors hover:border-foreground/50 hover:bg-surface-elevated/60"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  SOC 2 · fintech
                </span>
                <span className="font-mono text-[10px] text-muted-foreground group-hover:text-foreground">
                  →
                </span>
              </div>
              <p className="mt-1 text-sm font-medium">FinovaBank</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Broken: plaintext PII, LLM giving investment advice
              </p>
            </Link>
            <Link
              href="/new?scenario=novogen"
              className="group block rounded-lg border border-border bg-surface/60 p-3 transition-colors hover:border-foreground/50 hover:bg-surface-elevated/60"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  HIPAA · biotech
                </span>
                <span className="font-mono text-[10px] text-muted-foreground group-hover:text-foreground">
                  →
                </span>
              </div>
              <p className="mt-1 text-sm font-medium">NovoGen Health</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Broken: AI diagnoses with no clinician in the loop
              </p>
            </Link>
            <Link
              href="/new?scenario=ledgerwise"
              className="group block rounded-lg border border-emerald-500/30 bg-emerald-500/[0.03] p-3 transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/[0.06]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/80">
                  PCI DSS · payments
                </span>
                <span className="font-mono text-[10px] text-emerald-400/60 group-hover:text-emerald-300">
                  →
                </span>
              </div>
              <p className="mt-1 text-sm font-medium">Ledgerwise</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Well-run: tokenized cards, MFA, tamper-evident audit chain
              </p>
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-3 text-xs text-muted-foreground"
          >
            Or{" "}
            <Link href="/new" className="underline underline-offset-2 hover:text-foreground">
              paste your own GitHub repo
            </Link>
            {" "}— public repos work without a token.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 flex items-center gap-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
          >
            <span>Code + policy</span>
            <span className="h-3 w-px bg-border" />
            <span>Streaming</span>
            <span className="h-3 w-px bg-border" />
            <span>Claude-powered</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative flex items-center"
        >
          <DashboardMock />
        </motion.div>
      </div>
    </section>
  );
}
