# Architecture

A deeper look at how Lexitude is built. For the "what does it do" and
"how do I run it" docs, see the [README](../README.md).

---

## The five-module pipeline

```
                          ┌──────────────────┐
                          │  00  Ingest      │
                          │  GitHub tree +   │
                          │  policy parsing  │
                          └────────┬─────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                ▼                  ▼                  ▼
        ┌────────────┐    ┌────────────┐    ┌────────────┐
        │ 01  Code   │    │ 02  Policy │    │  Snapshot  │
        │ Compliance │    │ Intel.     │    │  (UX flair)│
        │ Haiku 4.5  │    │ Haiku 4.5  │    │ Haiku 4.5  │
        └─────┬──────┘    └─────┬──────┘    └────────────┘
              │                 │
              └────────┬────────┘
                       │
              ┌────────┴─────────┐
              ▼                  ▼
        ┌────────────┐    ┌────────────┐
        │ 03  Risk   │    │ 04 Review  │
        │ Synthesis  │    │ Independent│
        │ Opus 4.7   │    │ calibration│
        │ (adaptive  │    │ Haiku 4.5  │
        │  thinking) │    │            │
        └─────┬──────┘    └─────┬──────┘
              └────────┬────────┘
                       ▼
                   Save to Supabase
```

**Key choices that aren't obvious from the diagram:**

- **Code + Policy run in parallel**, not sequentially. They're independent
  producers — Policy doesn't need Code's findings, Code doesn't need
  Policy's. We don't waste wall-clock time chaining them.
- **Risk + Review also run in parallel.** Review is structured as an
  *independent* second-opinion pass on Code + Policy, not a critique of
  Risk's output. That means it doesn't have to wait for Risk to finish,
  and its judgment can't be anchored by Risk's framing. Total wall-clock
  saved: one full Review duration (~15s).
- **Snapshot is a freebie.** It's a ~3s Haiku pass on the file tree +
  `package.json` + README that gives the user something to read while
  Code and Policy churn. It can fail silently without killing the run.

---

## Model strategy

Different modules, different cost/intelligence tradeoffs. Keyed in
`lib/audit/anthropic.ts`.

| Module | Model | Why |
| --- | --- | --- |
| Code Compliance | Haiku 4.5 | Structured scanning across dozens of files. The task is "match this line to this control," not nuanced cross-reasoning — Haiku is cheap, fast, and accurate enough. |
| Policy Intelligence | Haiku 4.5 | Policy docs are short (<30KB typical) and the output shape is rigid JSON. Sonnet's extra nuance didn't earn its ~3x latency penalty in demo-length runs. |
| Risk Synthesis | **Opus 4.7** with adaptive thinking | The one module where extended thinking earns its keep. Cross-cuts Code + Policy, reconciles conflicting evidence, produces exec-facing prioritization. |
| Audit Review | Haiku 4.5 | Calibrating *already-structured* findings (adjusting severities, spotting hallucinations) is pattern-matching, not deep reasoning. Haiku hits the same calibration targets as Sonnet-with-thinking in a fraction of the time. |
| Snapshot | Haiku 4.5 | See above — 3s UX nicety. |

**We don't use Sonnet at all.** Every slot where you might reach for
Sonnet benchmarks either as well on Haiku (cheaper + faster) or
genuinely needs Opus (not close).

---

## Streaming protocol

Every audit route is a long-running request that needs live progress.
We use NDJSON over a standard `Response` stream — one JSON object per
line. Simpler than SSE, no client library required, and fits naturally
with Anthropic's `client.messages.stream(...)`.

**Producer** — `lib/stream/server.ts`:

```ts
export function createAuditStream(
  producer: (send: (ev: AuditStreamEvent) => void) => Promise<void>,
): Response
```

Takes a producer function that receives a `send` callback, returns a
`Response` streaming NDJSON with appropriate headers
(`X-Accel-Buffering: no` is the hack that makes it work through
reverse proxies).

**Consumer** — `lib/stream/client.ts`:

```ts
export async function consumeNdjsonStream(
  response: Response,
  onEvent: (ev: AuditStreamEvent) => void,
): Promise<void>
```

Reads the body, splits on newlines, JSON-parses each line, fires
`onEvent`. Handles partial lines buffered across chunks.

**Event shape** is one discriminated union — canonical definition in
`lib/types.ts` so the producer and consumer literally share the type:

```ts
type AuditStreamEvent =
  | { type: "status"; phase: string }
  | { type: "delta"; text: string }           // streaming commentary
  | { type: "thinking"; text: string }        // extended-thinking tokens
  | { type: "result"; payload: unknown }      // final structured JSON
  | { type: "error"; message: string };
```

---

## No-policies mode

Judges can skip policy upload entirely. When they do:

1. `/api/audit/policy` still runs, but with `docs: []`.
2. The prompt switches to `policyAuditNoDocsSystemPrompt` — which asks
   the model to *infer the required policy stack* for the chosen
   framework + code findings.
3. Downstream (Risk + Review) sees a real `PolicyResult` object, not
   `null`, so the rest of the pipeline works unchanged.
4. The result is a "gap list" — the actual policies this company
   needs to write, not what they have. Useful for "we haven't written
   any of this yet" conversations.

---

## Ingest resilience

`lib/ingest/github.ts` and `app/api/github/route.ts` have a few
non-obvious defenses:

- **`maxDuration = 60`** on the Vercel function. Default is 10s, which
  is not enough for a cold boot + 100 parallel GitHub blob fetches.
  When a function times out, Vercel serves an HTML error page — which
  blows up the client's `.json()` call with a cryptic parse error
  unless you catch it (we do, in `readJsonOrThrow`).
- **Fail-fast on missing `GITHUB_TOKEN`**. Unauthenticated GitHub is
  rate-limited to 60 req/hr per IP, and Vercel's shared egress IPs
  mean that ceiling is shared across everyone on the platform. If
  the env var isn't set, the route returns a JSON 500 with a clear
  message pointing at the Vercel dashboard, not a 403 from GitHub.
- **Dynamic import of `pdf-parse`**. The package runs debug-mode
  side effects at module load (tries to read a test PDF from its
  own package dir). On Vercel that file isn't bundled and the import
  throws ENOENT — which would take the whole `/api/parse-docs` route
  down at cold boot. We wrap the import inside `extractPdfText` so
  JSON-only payloads (Ledgerwise, FinovaBank, NovoGen) never load it.

---

## Storage

**Supabase with permissive RLS + publishable (anon) key.**

This is deliberate. Lexitude is a hackathon demo with no user accounts
— every judge sees the shared "Past runs" feed. The `audit_runs`
table has a permissive RLS policy that allows inserts and selects
from the anon role, and the publishable key is shipped to the
browser with `NEXT_PUBLIC_` prefix.

If this were a production tool with customer data, the fix is: move
`/api/audit/runs` to write with the service-role key on the server
side, tighten RLS to deny direct anon writes, and gate reads behind
auth. The code is structured so that swap is ~20 lines in
`lib/supabase.ts` + route handlers.

Schema lives in `supabase/schema.sql`.

---

## Independence of the Review module

The reviewer is intentionally *not* given Risk's output. Giving it
Risk would anchor it — it would just agree or disagree with Risk's
framing. Instead, Review gets the same raw inputs Risk gets (the
Code + Policy results) and produces its own verdict in parallel.

The UI displays Risk's verdict first and Review's calibration notes
second, so miscalibrated severities and missed cross-cutting risks
are visibly flagged as a *second* opinion, not a consensus vote.

Prompt lives in `lib/audit/prompts.ts` under `reviewerSystemPrompt`.

---

## Demo fixtures

Three canned scenarios under `demo/`:

| Company | Framework | Role | Expected outcome |
| --- | --- | --- | --- |
| FinovaBank | SOC 2 | Bad-example | Low score, many high/critical findings across code and policy |
| NovoGen Health | HIPAA | Bad-example | Low score — PHI in localStorage, AI diagnoses without review, no BAA |
| Ledgerwise | PCI DSS | **Good-example** | High score — mostly affirmations. Proves the tool doesn't just rubber-stamp "fail." |

All three fixture repos are deliberately-crafted sample code used as
audit *input*, not part of the app. They're excluded from ESLint
(`eslint.config.mjs` → `globalIgnores`) and from GitGuardian
(`.gitguardian.yaml` → `paths-ignore`) since FinovaBank and NovoGen
contain fake hardcoded credentials by design.

---

## Limitations

- **Public repos only.** We call the GitHub REST API with a PAT; no
  OAuth flow. Private repos would need per-user auth.
- **No branching or PR context.** We audit the default branch (or a
  pinned branch for the demo scenarios). No diff-based "what changed"
  mode.
- **Single-language prompts.** Framework rules are hardcoded in
  English. Adding a new framework means adding a prompt section in
  `lib/audit/prompts.ts`.
- **No retry logic on streaming errors.** If Anthropic drops a stream
  mid-way, the module fails and the run continues around it (via
  `Promise.allSettled`) — but the user sees an error card. A
  production version would retry with exponential backoff.
