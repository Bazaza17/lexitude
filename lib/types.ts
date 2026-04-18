export type Framework = "SOC2" | "GDPR" | "HIPAA" | "ISO27001" | "PCIDSS";

const FRAMEWORK_DISPLAY_NAMES: Record<Framework, string> = {
  SOC2: "SOC 2",
  GDPR: "GDPR",
  HIPAA: "HIPAA",
  ISO27001: "ISO 27001",
  PCIDSS: "PCI DSS",
};

// Map the stored enum value (e.g. "PCIDSS") to the human-readable display
// name (e.g. "PCI DSS"). Unknown strings pass through unchanged so legacy
// rows with free-form values still render.
export function frameworkDisplayName(f: Framework | string): string {
  if (f in FRAMEWORK_DISPLAY_NAMES) {
    return FRAMEWORK_DISPLAY_NAMES[f as Framework];
  }
  return String(f);
}
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type Severity = RiskLevel;

export type CodeFinding = {
  file: string;
  line: number | null;
  severity: Severity;
  category: string;
  controlId?: string | null;
  issue: string;
  recommendation: string;
};

export type CodeResult = {
  score: number;
  riskLevel: RiskLevel;
  summary: string;
  findings: CodeFinding[];
  stats?: {
    filesAnalyzed: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
};

export type PolicyConflict = {
  docs: string[];
  severity: Severity;
  controlId?: string | null;
  issue: string;
  recommendation: string;
};

export type PolicyGap = {
  requirement: string;
  severity: Severity;
  controlId?: string | null;
  issue: string;
  recommendation: string;
};

export type CodeVsPolicy = {
  policy: string;
  policyDoc: string;
  code: string;
  codeLocation: string;
  controlId?: string | null;
  severity: Severity;
};

export type PolicyResult = {
  score: number;
  riskLevel: RiskLevel;
  summary: string;
  conflicts: PolicyConflict[];
  gaps: PolicyGap[];
  codeVsPolicyConflicts: CodeVsPolicy[];
};

export type TopInsight = {
  title: string;
  severity: Severity;
  controlId?: string | null;
  description: string;
  evidence: string[];
};

export type PriorityAction = {
  rank: number;
  title: string;
  owner: string;
  timeframe: string;
  controlIds?: string[];
  closes: string[];
};

export type RiskResult = {
  overallScore: number;
  riskLevel: RiskLevel;
  executiveSummary: string;
  topInsights: TopInsight[];
  priorityActions: PriorityAction[];
};

export type ReviewHallucination = {
  source: "code" | "policy" | "risk";
  issue: string;
  severity: Severity;
};

export type ReviewMiscalibration = {
  source: "code" | "policy" | "risk";
  finding: string;
  originalSeverity: Severity;
  suggestedSeverity: Severity;
  rationale: string;
};

export type ReviewMissedRisk = {
  title: string;
  severity: Severity;
  controlId?: string | null;
  description: string;
};

export type ReviewActionNow = {
  rank: number;
  title: string;
  why: string;
  controlIds?: string[];
};

export type ReviewDefer = {
  title: string;
  why: string;
};

export type RepoSnapshotFlag = {
  severity: Severity;
  flag: string;
  why: string;
};

export type RepoSnapshot = {
  stack: string;
  surface: string;
  firstImpression: string;
  quickFlags: RepoSnapshotFlag[];
};

export type ReviewResult = {
  confidence: "low" | "medium" | "high";
  adjustedScore: number;
  adjustedRiskLevel: RiskLevel;
  verdict: string;
  hallucinations: ReviewHallucination[];
  miscalibrations: ReviewMiscalibration[];
  missedRisks: ReviewMissedRisk[];
  actNow: ReviewActionNow[];
  defer: ReviewDefer[];
};

// NDJSON event shape streamed from every audit route to the client. Kept
// here (not in sse.ts / stream-client.ts) so the producer side and the
// consumer side literally share one declaration — no risk of the two
// drifting. `lib/stream/server.ts` is server-only (Node runtime, uses
// ReadableStream) and `lib/stream/client.ts` is browser-only, so they
// can't directly import each other.
export type AuditStreamEvent =
  | { type: "status"; phase: string }
  | { type: "delta"; text: string }
  | { type: "thinking"; text: string }
  | { type: "result"; payload: unknown }
  | { type: "error"; message: string };

export type AuditRunRow = {
  id: string;
  created_at: string;
  company_name: string;
  framework: Framework;
  repo_url: string | null;
  repo_branch: string | null;
  file_count: number | null;
  doc_count: number | null;
  code_result: CodeResult | null;
  policy_result: PolicyResult | null;
  risk_result: RiskResult | null;
  review_result: ReviewResult | null;
  overall_score: number | null;
  risk_level: RiskLevel | null;
};
