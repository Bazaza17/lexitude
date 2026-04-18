import { fetchRepo, type RepoFile } from "@/lib/ingest/github";

/**
 * Path allowlist for auto-discovering policy-like documents in a repo.
 *
 * fetchRepo's `selectedPaths` matches exactly or by `startsWith(norm + "/")`,
 * so single-file entries like `SECURITY.md` match that exact file, and
 * directory entries like `docs/compliance` match everything under them.
 *
 * Covers the usual suspects across the ecosystem:
 *   - Top-level GitHub community files (SECURITY.md, CODE_OF_CONDUCT.md, …)
 *   - Conventional doc folders (docs/compliance, docs/policies, docs/security)
 *   - Short-form policy folders (policies/, compliance/, governance/)
 *   - Hidden governance folders (.compliance, .security)
 */
export const POLICY_PATHS: string[] = [
  // Top-level conventional files
  "SECURITY.md",
  "security.md",
  "PRIVACY.md",
  "privacy.md",
  "COMPLIANCE.md",
  "compliance.md",
  "CODE_OF_CONDUCT.md",
  "code_of_conduct.md",
  "TERMS.md",
  "terms.md",
  "AUP.md",
  "aup.md",
  "ACCEPTABLE_USE.md",
  "DATA_PROTECTION.md",
  "INCIDENT_RESPONSE.md",
  "VULNERABILITY_DISCLOSURE.md",

  // Conventional doc trees
  "docs/compliance",
  "docs/policies",
  "docs/policy",
  "docs/security",
  "docs/privacy",
  "docs/governance",
  "docs/legal",

  // Short-form policy folders
  "compliance",
  "policies",
  "policy",
  "governance",
  "security",

  // Hidden governance folders
  ".compliance",
  ".security",
  ".github/SECURITY.md",
  ".github/security.md",
];

export type DiscoveredDoc = {
  path: string;
  name: string;
  text: string;
  bytes: number;
  truncated: boolean;
};

export type DiscoverPoliciesResult = {
  owner: string;
  repo: string;
  branch: string;
  docs: DiscoveredDoc[];
  totalCandidates: number;
};

/**
 * Pull likely policy documents out of a GitHub repo. Runs through the same
 * `fetchRepo` pipeline as the code audit — text-extension filter, skipped
 * dir list, size caps — but scoped to the policy path allowlist.
 */
export async function discoverPolicies(args: {
  repoUrl: string;
  token?: string;
  branch?: string;
}): Promise<DiscoverPoliciesResult> {
  const result = await fetchRepo({
    repoUrl: args.repoUrl,
    token: args.token,
    branch: args.branch,
    selectedPaths: POLICY_PATHS,
    // Policy docs are usually < 30 files; cap generously.
    maxFiles: 50,
    // Allow larger per-file body than code audits — policies are prose.
    maxFileBytes: 120_000,
  });

  const docs: DiscoveredDoc[] = result.files
    .filter((f: RepoFile) => /\.(md|mdx|txt)$/i.test(f.path))
    .map((f: RepoFile) => ({
      path: f.path,
      name: f.path.split("/").pop() ?? f.path,
      text: f.content,
      bytes: f.bytes,
      truncated: f.truncated,
    }));

  return {
    owner: result.owner,
    repo: result.repo,
    branch: result.branch,
    docs,
    totalCandidates: result.totalCandidates,
  };
}
