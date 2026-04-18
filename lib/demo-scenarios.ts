import type { Framework } from "./types";

export type DemoScenario = {
  id: string;
  companyName: string;
  industry: string;
  framework: Framework;
  repoUrl: string;
  repoPaths: string;
  policyText: string;
  blurb: string;
  // Optional: pre-seed the "auto-discovered from repo" list so a scenario
  // can showcase the in-repo policy path without the user clicking the
  // auto-discover button. Ledgerwise uses this because its SECURITY.md
  // actually lives in the repo tree — the doc should show up under
  // "Pull from a source" the moment the wizard opens, not inside the
  // pasted-text fallback.
  discoveredDocs?: Array<{ path: string; name: string; text: string }>;
};

// Pre-filled scenarios for the /new wizard. Clicking a scenario card on the
// homepage seeds the wizard with known-good inputs so reviewers can run a full
// audit in one click.
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "finovabank",
    companyName: "FinovaBank",
    industry: "Consumer banking · 280 employees · US + EU",
    framework: "SOC2",
    repoUrl: "https://github.com/Bazaza17/lexitude",
    repoPaths: "demo/finovabank/repo",
    blurb:
      "SOC 2 run on a fintech that ships plaintext PII to Mixpanel, stores card numbers in localStorage, and tells an LLM to give investment advice.",
    policyText: `FinovaBank — Data Privacy Policy
- PII must never be written to logs.
- All PII must be encrypted at rest using AES-256.
- Card numbers must not be stored in browser storage.
- PII sharing with third parties requires consent and a DPA.
- Production secrets must not appear in source control.
- Queries must use parameterized SQL.

FinovaBank — AI Usage Policy
- Customer-facing AI output must pass human review or deterministic guardrails.
- AI must not give personalized financial advice.
- SSNs and card numbers must not be sent to foundation-model APIs.
- AI endpoints must enforce rate limits and authentication.`,
  },
  {
    id: "novogen",
    companyName: "NovoGen Health",
    industry: "Consumer genomics + clinical decision support · 95 employees · US",
    framework: "HIPAA",
    // Pinned to the `demo` branch because novogen fixtures haven't been
    // merged to main yet. `parseRepoUrl` can't resolve slash-containing
    // branch names, so we pushed a slash-free alias and point here.
    repoUrl: "https://github.com/Bazaza17/lexitude/tree/demo",
    repoPaths: "demo/novogen/repo",
    blurb:
      "HIPAA run on a biotech that streams unreviewed AI diagnoses to patients, writes PHI to localStorage, and ships genomic data to Anthropic without a BAA.",
    policyText: `NovoGen Health — HIPAA Privacy & Security Policy
- All PHI must be encrypted at rest (AES-256 field-level) and in transit (TLS 1.2+).
- Each workforce user has a unique identifier; shared DB users are prohibited (§164.312(a)(2)(i)).
- Every access, creation, modification, or deletion of a patient record is recorded in the tamper-evident audit log (§164.312(b)).
- PHI must never be written to localStorage, sessionStorage, or cookies.
- Automatic session logoff is required after 15 minutes of inactivity (§164.312(a)(2)(iii)).
- PHI sent to foundation-model APIs must be de-identified per §164.514 and covered by a BAA.

NovoGen Health — AI Clinical Use Policy
- AI-generated clinical interpretations must be reviewed by a board-certified clinician before being shown to a patient.
- AI systems must not produce diagnostic conclusions or specific treatment recommendations.
- Patients must complete an AI consent flow before any AI-assisted interaction.
- Foundation-model providers must be covered by a signed BAA prior to processing PHI.`,
  },
  {
    id: "ledgerwise",
    companyName: "Ledgerwise",
    industry: "Embedded payments for SMB accounting platforms · 70 employees · US + CA",
    framework: "PCIDSS",
    // Same /tree/demo pin as novogen — the ledgerwise fixtures live in the
    // demo branch alongside the other scenario repos.
    repoUrl: "https://github.com/Bazaza17/lexitude/tree/demo",
    repoPaths: "demo/ledgerwise/repo",
    blurb:
      "PCI DSS run on a well-run payment processor — tokenized cards, Argon2id + MFA, tamper-evident audit chain, strict CORS, and a matching security policy.",
    // Policy text intentionally empty — Ledgerwise's SECURITY.md lives in
    // the repo and is pre-seeded as a discovered-from-source doc below.
    // This matches the real-world narrative ("the policy is checked into
    // the repo next to the code it governs"), and the wizard's step 3
    // visibly shows the file rather than a blank textarea + hidden paste.
    policyText: "",
    discoveredDocs: [
      {
        path: "demo/ledgerwise/repo/SECURITY.md",
        name: "SECURITY.md",
        text: `# Ledgerwise — Security & PCI DSS Policy

Ledgerwise processes card payments for small-business accounting platforms.
Because the browser tokenizes cards via Stripe Elements, our cardholder
data environment (CDE) is limited to Stripe payment method tokens
(\`pm_...\`) and the resulting charge IDs. We validate SAQ A-EP annually.

## Cardholder data handling (PCI DSS 3.x / 4.x)

- Ledgerwise **never** receives, processes, stores, or transmits raw PANs,
  CVVs, or magnetic-stripe data. All card entry is Stripe Elements.
- No cardholder data is written to logs, the database, or third-party
  analytics. The audit log's free-form \`metadata\` field is explicitly
  forbidden from containing PAN, CVV, or cardholder name.
- Storage in any form other than Stripe payment method tokens is a Sev-1
  incident.

## Authentication & session management (PCI DSS 8.x)

- Passwords are hashed with Argon2id (m=64MB, t=3, p=4). No plaintext or
  reversible encoding at rest.
- MFA is required for all operator accounts. No bypass flag exists.
- Sessions expire after 15 minutes of inactivity and 8 hours absolute.
- Login endpoints are rate-limited per IP (5/5min) and per user
  (10/15min). Exceeding either locks the account and pages an on-call
  operator.

## Secrets management (PCI DSS 3.5 / 3.6)

- No secrets in source control. CI enforces this via gitleaks pre-receive.
- Runtime secrets are fetched from the secrets manager into env at pod
  start; rotation is quarterly (automated) and on any suspected exposure.

## Logging & monitoring (PCI DSS 10.x)

- Every authentication event, charge, refund, dispute, and admin action
  is recorded in the tamper-evident \`audit_log\` table (HMAC chain).
- A nightly verifier walks the chain; a break pages the security on-call.
- Raw IPs are never stored — we hash (SHA-256 + pepper) before writing.

## API protection (PCI DSS 6.6)

- CORS is origin-allowlist only — no wildcard, no null. Preflight is
  limited to the allowed methods and headers.
- All cardholder-data-adjacent endpoints enforce the full security
  header set (HSTS preload, CSP \`default-src 'self'\`, X-Frame-Options
  DENY, X-Content-Type-Options nosniff).
- All SQL uses parameterized statements — string interpolation into SQL
  is forbidden by ESLint rule \`no-restricted-syntax\`.

## Testing & change control (PCI DSS 6.x / 11.3)

- External penetration testing is performed quarterly and after any
  significant change to the CDE. Findings are tracked to remediation in
  the security issue tracker.
- Change control: every production deploy requires a signed-off security
  review for any file touching \`app/api/payments/\`, \`lib/audit-log.ts\`,
  \`lib/session.ts\`, or \`middleware.ts\`.
`,
      },
    ],
  },
];

export function getScenario(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === id);
}
