import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names (Tailwind friendly).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a GitHub repository URL into owner and repo.
 *
 * Accepts forms like:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 * - github.com/owner/repo
 */
export function parseGithubUrl(url: string): { owner: string; repo: string } {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid github repo url");
  }

  // Normalize common git@ style to https-like path
  const normalized = url.startsWith("git@")
    ? url.replace(/^git@/, "https://").replace(":", "/")
    : url;

  // Allow urls with or without protocol
  const withHost = normalized.includes("github.com")
    ? normalized
    : `https://${normalized}`;

  const match = withHost.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git|\/|$)/i);

  if (!match) {
    throw new Error("Invalid github repo url");
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, "");

  return { owner, repo };
}

/**
 * Minimal typing for a Git tree entry returned by the GitHub API.
 */
export type GitTreeEntry = {
  path: string;
  mode?: string;
  type: "blob" | "tree" | "commit";
  sha?: string;
  size?: number;
  url?: string;
};

/**
 * Fetch the repository tree for a branch (defaults to `main`) recursively.
 *
 * Options:
 * - branch: branch name to fetch (default: "main")
 * - token: optional GitHub token to increase rate limits / access private repos
 */
export async function fetchRepoTree(
  owner: string,
  repo: string,
  options?: { branch?: string; token?: string },
): Promise<GitTreeEntry[]> {
  const branch = options?.branch ?? "main";
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(
    branch,
  )}?recursive=1`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };

  if (options?.token) {
    headers.Authorization = `token ${options.token}`;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Tree fetch failed (${res.status} ${res.statusText}): ${text || "no body"}`,
    );
  }

  const data = await res.json().catch(() => null);

  if (!data || !Array.isArray(data.tree)) {
    throw new Error("Unexpected response format from GitHub API");
  }

  return data.tree as GitTreeEntry[];
}

/**
 * Navigation item used by the app sidebar.
 *
 * Matches the shape used in `components/app-sidebar.tsx`.
 */
export type NavItem = {
  title: string;
  url: string;
  isActive?: boolean;
  items?: NavItem[];
};

/**
 * Build a hierarchical sidebar structure from a flat Git tree.
 *
 * Behavior:
 * - Both directories and files become nodes.
 * - Files are leaves (no children); directories contain `items`.
 * - File titles have their extension stripped for readability.
 * - The `url` is the raw repository path (e.g. `docs/intro.md`).
 */
export function buildSidebar(tree: GitTreeEntry[]): NavItem[] {
  type InternalNode = {
    children: Record<string, InternalNode>;
    isFile?: boolean;
  };

  const root: Record<string, InternalNode> = {};

  for (const entry of tree) {
    // Skip entries that don't have a path
    if (!entry || typeof entry.path !== "string" || entry.path.length === 0)
      continue;

    const parts = entry.path.split("/").filter(Boolean);

    // Skip any paths that contain hidden files/directories (starting with '.')
    if (parts.some((part) => part.startsWith("."))) continue;

    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      const isFile = isLeaf && entry.type === "blob";

      if (!current[part]) {
        current[part] = { children: {}, isFile: isFile };
      } else if (isFile) {
        // mark existing node as file if the tree indicates it's a file
        current[part].isFile = true;
      }

      current = current[part].children;
    }
  }

  function convert(
    nodeMap: Record<string, InternalNode>,
    parentPath = "",
  ): NavItem[] {
    // Keep deterministic order by using Object.keys order (GitHub returns tree in repo order)
    return Object.keys(nodeMap).map((key) => {
      const node = nodeMap[key];
      const path = parentPath ? `${parentPath}/${key}` : key;

      const childrenKeys = Object.keys(node.children);
      const items =
        childrenKeys.length > 0 ? convert(node.children, path) : undefined;

      const title = node.isFile ? stripExtension(key) : key;

      return {
        title,
        url: path,
        items,
      };
    });
  }

  return convert(root, "");
}

/**
 * Fetch raw markdown (or any raw file) content for a path in the repository.
 *
 * - Uses the GitHub contents API with Accept: application/vnd.github.raw so the body
 *   is returned as raw file text.
 * - Pass a token via options.token for private repos or higher rate limits.
 */
export async function fetchMarkdown(
  owner: string,
  repo: string,
  path: string,
  options?: { token?: string; ref?: string },
): Promise<string> {
  if (!path || path.length === 0) {
    throw new Error("Path must be provided");
  }

  // Encode ref if provided
  const params = options?.ref ? `?ref=${encodeURIComponent(options.ref)}` : "";

  // Encode owner and repo safely
  const encOwner = encodeURIComponent(owner);
  const encRepo = encodeURIComponent(repo);

  // Encode each path segment but preserve forward slashes so GitHub API
  // receives a path like "docs/intro.md" rather than "docs%2Fintro.md".
  // First decode any existing encoding to prevent double-encoding.
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
    .join("/");

  const url = `https://api.github.com/repos/${encOwner}/${encRepo}/contents/${encodedPath}${params}`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw",
  };

  if (options?.token) {
    headers.Authorization = `token ${options.token}`;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Markdown fetch failed (${res.status} ${res.statusText}): ${text || "no body"}`,
    );
  }

  const body = await res.text();
  return body;
}

/* Helpers */

function stripExtension(name: string): string {
  // remove final extension like ".md", ".mdx", ".txt"
  return name.replace(/\.[^/.]+$/, "");
}
