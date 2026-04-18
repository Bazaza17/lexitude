# Lexitude

**An audit that reads your code and your policy, and tells you where they disagree.**

Lexitude ingests a GitHub repo and (optionally) a stack of policy docs, then
runs a five-module pipeline to produce a compliance verdict against your
chosen framework (SOC 2, GDPR, HIPAA, ISO 27001, or PCI DSS). Every module
streams its reasoning live — nothing is a black box.

Built for the eMerge AI Hackathon. Powered by Claude (Haiku 4.5, Sonnet 4.6,
Opus 4.7) + Supabase.

---

## For judges — try it in one click

The landing page has three pre-configured scenario cards. Each one seeds the
wizard with a ready-to-run repo + policy, so you can kick off an audit
without typing anything:

| Scenario | Framework | What it shows |
| --- | --- | --- |
| **FinovaBank** | SOC 2 | A fintech doing everything wrong — plaintext PII in logs, card numbers in localStorage, an LLM handing out investment advice. High-severity findings across code and policy. |
| **NovoGen Health** | HIPAA | A biotech streaming unreviewed AI diagnoses, writing PHI to localStorage, and shipping genomic data to foundation models without a BAA. |
| **Ledgerwise** *(green card)* | PCI DSS | A **well-run** payment processor — tokenized cards, Argon2id + MFA, tamper-evident audit chain, strict CORS. Demonstrates that Lexitude also correctly recognizes good work; you should see a high score with mostly affirmations. |

Click any card, step through the four-step wizard, and hit **Start audit**.
The run takes ~30–60 seconds.

### Or try your own repo

Click **Start an audit** from the landing page and paste any public GitHub
URL. The wizard takes an optional `paths` field (comma-separated) if you
want to scope the scan to specific directories — leave it blank to audit
the whole repo.

Policies are optional. If you don't upload any, Lexitude infers the
required-policy list for your framework from the code findings (useful for
"what policies should we even have?" conversations).

---

## Pipeline

```
Ingest  →  Code Compliance   ┐
             (Haiku 4.5)     │
         +                   ├→  Risk Synthesis   →  Save
           Policy Intel      │     (Opus 4.7)
             (Haiku 4.5)     │  +
                             │    Audit Review
                             ┘     (Haiku 4.5)
```

- **Code Compliance** — scans the repo for framework-specific issues
  (hardcoded secrets, missing authz, PII logging, SQL injection, etc.).
- **Policy Intelligence** — reads the policy docs, flags internal conflicts,
  missing-control gaps, and mismatches against code findings.
- **Risk Synthesis** — Opus with adaptive thinking cross-references the
  two, producing an executive verdict + prioritized action list.
- **Audit Review** — an independent second-opinion pass that calibrates
  the other analysts' findings (flags hallucinations, miscalibrated
  severities, missed cross-cutting risk).

Each module streams commentary and thinking tokens live to the browser.

---

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY, Supabase, GITHUB_TOKEN
npm run dev
```

Required env:

- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com/)
- `GITHUB_TOKEN` — fine-grained PAT with public-repo read-only (avoids
  GitHub's 60 req/hr unauth rate limit)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — for
  run history. See `supabase/schema.sql` for the one-time setup SQL.

Open [http://localhost:3000](http://localhost:3000).

---

## Repo layout

```
app/              Next.js 16 App Router
  api/audit/*     One route per pipeline module; each streams NDJSON
  new/            Four-step wizard
  run/            Live audit dashboard
  (app)/history/  Run history + archive view
components/site/  Landing-page pieces
lib/              Model wiring, prompts, GitHub fetcher, Supabase client
demo/             Pre-seeded fixture repos for the scenario cards
supabase/         One-shot schema.sql
```

---

## Judges: what files to look at first

- **Pipeline orchestration** — `app/run/page.tsx` (the `runPipeline` fn)
- **Prompt design** — `lib/audit-prompts.ts`
- **Model strategy** — `lib/anthropic.ts` (Haiku for scan/calibration,
  Opus for synthesis)
- **GitHub ingestion** — `lib/github.ts`, `lib/policy-discovery.ts`
- **Streaming protocol** — `lib/sse.ts`, `lib/stream-client.ts`
