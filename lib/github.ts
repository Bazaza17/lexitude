export type RepoFile = {
  path: string;
  content: string;
  language: string;
  bytes: number;
  truncated: boolean;
};

export type FetchRepoOptions = {
  repoUrl: string;
  token?: string;
  selectedPaths?: string[];
  maxFiles?: number;
  maxFileBytes?: number;
  branch?: string;
};

export type FetchRepoResult = {
  owner: string;
  repo: string;
  branch: string;
  files: RepoFile[];
  skipped: { path: string; reason: string }[];
  totalCandidates: number;
};

const DEFAULT_MAX_FILES = 100;
const DEFAULT_MAX_FILE_BYTES = 40_000;

const TEXT_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "py", "rb", "go", "java", "kt", "rs", "php", "cs", "swift", "scala",
  "c", "cc", "cpp", "h", "hpp",
  "json", "yaml", "yml", "toml", "ini", "env",
  "sql", "sh", "bash", "zsh",
  "md", "mdx", "txt",
  "html", "css", "scss", "sass",
  "graphql", "proto",
  "tf", "hcl",
  "dockerfile",
]);

const SKIP_DIRS = new Set([
  "node_modules", ".next", ".turbo", "dist", "build", "out",
  ".git", ".cache", "coverage", ".venv", "venv", "__pycache__",
  "target", "vendor", ".pnpm-store",
]);

export function parseRepoUrl(input: string): { owner: string; repo: string; branch?: string; subpath?: string } {
  const trimmed = input.trim().replace(/\/+$/, "");
  const match = trimmed.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?(?:\/(tree|blob)\/([^/]+)(?:\/(.+))?)?$/);
  if (!match) throw new Error(`Not a recognized GitHub URL: ${input}`);
  return {
    owner: match[1],
    repo: match[2],
    branch: match[4],
    subpath: match[5],
  };
}

function extensionOf(path: string): string {
  const base = path.split("/").pop() ?? "";
  if (base.toLowerCase() === "dockerfile") return "dockerfile";
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.slice(dot + 1).toLowerCase();
}

function isLikelyText(path: string): boolean {
  const ext = extensionOf(path);
  if (!ext) return false;
  return TEXT_EXTENSIONS.has(ext);
}

function isInSkippedDir(path: string): boolean {
  return path.split("/").some((seg) => SKIP_DIRS.has(seg));
}

function matchesSelected(path: string, selected: string[] | undefined): boolean {
  if (!selected || selected.length === 0) return true;
  return selected.some((p) => {
    const norm = p.replace(/^\/+|\/+$/g, "");
    return path === norm || path.startsWith(norm + "/");
  });
}

function languageOf(path: string): string {
  const ext = extensionOf(path);
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    mjs: "javascript", cjs: "javascript",
    py: "python", rb: "ruby", go: "go", java: "java", kt: "kotlin",
    rs: "rust", php: "php", cs: "csharp", swift: "swift", scala: "scala",
    c: "c", cc: "cpp", cpp: "cpp", h: "c", hpp: "cpp",
    json: "json", yaml: "yaml", yml: "yaml", toml: "toml", ini: "ini", env: "env",
    sql: "sql", sh: "bash", bash: "bash", zsh: "bash",
    md: "markdown", mdx: "markdown", txt: "text",
    html: "html", css: "css", scss: "scss", sass: "sass",
    graphql: "graphql", proto: "proto",
    tf: "terraform", hcl: "terraform",
    dockerfile: "dockerfile",
  };
  return map[ext] ?? "text";
}

type GithubTreeEntry = {
  path: string;
  type: "blob" | "tree" | "commit";
  size?: number;
  sha: string;
};

type GithubRepoMeta = { default_branch: string };

async function gh<T>(url: string, token: string | undefined, accept = "application/vnd.github+json"): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: accept,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "AuditAI/0.1",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status} ${res.statusText} @ ${url}: ${body.slice(0, 200)}`);
  }
  if (accept === "application/vnd.github.raw") {
    return (await res.text()) as unknown as T;
  }
  return (await res.json()) as T;
}

export async function fetchRepo(opts: FetchRepoOptions): Promise<FetchRepoResult> {
  const { owner, repo, branch: urlBranch, subpath } = parseRepoUrl(opts.repoUrl);
  const token = opts.token ?? process.env.GITHUB_TOKEN;
  const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;
  const maxFileBytes = opts.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;

  let branch = opts.branch ?? urlBranch;
  if (!branch) {
    const meta = await gh<GithubRepoMeta>(`https://api.github.com/repos/${owner}/${repo}`, token);
    branch = meta.default_branch;
  }

  const tree = await gh<{ tree: GithubTreeEntry[]; truncated: boolean }>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    token,
  );

  const selected = [
    ...(opts.selectedPaths ?? []),
    ...(subpath ? [subpath] : []),
  ];

  const skipped: FetchRepoResult["skipped"] = [];
  const candidates = tree.tree
    .filter((e) => e.type === "blob")
    .filter((e) => {
      if (isInSkippedDir(e.path)) { skipped.push({ path: e.path, reason: "excluded-dir" }); return false; }
      if (!isLikelyText(e.path)) { skipped.push({ path: e.path, reason: "binary-or-unknown" }); return false; }
      if (!matchesSelected(e.path, selected.length ? selected : undefined)) {
        skipped.push({ path: e.path, reason: "not-selected" });
        return false;
      }
      return true;
    });

  const totalCandidates = candidates.length;
  const picked = candidates.slice(0, maxFiles);
  for (const c of candidates.slice(maxFiles)) {
    skipped.push({ path: c.path, reason: "max-files-cap" });
  }

  const files: RepoFile[] = await Promise.all(
    picked.map(async (entry) => {
      const raw = await gh<string>(
        `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(entry.path)}?ref=${branch}`,
        token,
        "application/vnd.github.raw",
      );
      const truncated = raw.length > maxFileBytes;
      const content = truncated ? raw.slice(0, maxFileBytes) : raw;
      return {
        path: entry.path,
        content,
        language: languageOf(entry.path),
        bytes: raw.length,
        truncated,
      };
    }),
  );

  return { owner, repo, branch, files, skipped, totalCandidates };
}
