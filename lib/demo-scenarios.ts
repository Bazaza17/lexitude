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
    repoUrl: "https://github.com/Bazaza17/lexitude",
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
];

export function getScenario(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === id);
}
