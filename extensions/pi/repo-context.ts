import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { execFile } from "node:child_process";
import { access, readdir } from "node:fs/promises";
import { promisify } from "node:util";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      maxBuffer: 1024 * 1024,
      encoding: "utf8",
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function detectPackageManager(root: string): Promise<string | null> {
  const candidates: Array<[string, string]> = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"],
  ];
  for (const [file, manager] of candidates) {
    if (await exists(join(root, file))) return manager;
  }
  return null;
}

async function detectGuidance(root: string): Promise<string[]> {
  const direct = ["AGENTS.md", "CLAUDE.md", "CONTRIBUTING.md", "README.md"];
  const found: string[] = [];
  for (const file of direct) {
    if (await exists(join(root, file))) found.push(file);
  }
  for (const dir of ["docs", ".agents", ".codex", ".claude"]) {
    if (await exists(join(root, dir))) found.push(`${dir}/`);
  }
  return found;
}

export function registerRepoContext(pi: ExtensionAPI) {
  pi.registerTool({
    name: "hc_repo_context",
    label: "HarnessCraft Repo Context",
    description:
      "Return compact structured Git and repository context so the agent can establish branch, HEAD, working-tree state, recent commits, package manager, and guidance files in one call.",
    promptSnippet: "Get compact repository/Git context before substantial code changes",
    promptGuidelines: [
      "Prefer hc_repo_context near the start of substantial repository work instead of spending multiple bash calls reconstructing basic Git state.",
    ],
    parameters: Type.Object({
      recent_commits: Type.Optional(
        Type.Integer({
          minimum: 0,
          maximum: 10,
          description: "Number of recent commits to include. Defaults to 5.",
        }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const root = await git(ctx.cwd, ["rev-parse", "--show-toplevel"]);
      if (!root) throw new Error("Current directory is not inside a Git repository.");

      const recentCount = params.recent_commits ?? 5;
      const [branch, head, status, upstream, aheadBehind, diffStat, stagedStat, commits, packageManager, guidance] =
        await Promise.all([
          git(root, ["branch", "--show-current"]),
          git(root, ["rev-parse", "HEAD"]),
          git(root, ["status", "--porcelain=v1"]),
          git(root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]),
          git(root, ["rev-list", "--left-right", "--count", "@{upstream}...HEAD"]),
          git(root, ["diff", "--stat"]),
          git(root, ["diff", "--cached", "--stat"]),
          recentCount > 0
            ? git(root, ["log", `-${recentCount}`, "--pretty=format:%h%x09%s"])
            : Promise.resolve(""),
          detectPackageManager(root),
          detectGuidance(root),
        ]);

      let ahead: number | null = null;
      let behind: number | null = null;
      if (aheadBehind) {
        const [left, right] = aheadBehind.split(/\s+/).map(Number);
        if (Number.isFinite(left) && Number.isFinite(right)) {
          behind = left;
          ahead = right;
        }
      }

      const dirtyFiles = status ? status.split("\n").filter(Boolean) : [];
      const result = {
        root,
        branch: branch || null,
        head,
        clean: dirtyFiles.length === 0,
        changed_files: dirtyFiles.slice(0, 100),
        upstream,
        ahead,
        behind,
        diff_stat: diffStat || null,
        staged_stat: stagedStat || null,
        recent_commits: commits
          ? commits.split("\n").filter(Boolean).map((line) => {
              const [sha, ...message] = line.split("\t");
              return { sha, message: message.join("\t") };
            })
          : [],
        package_manager: packageManager,
        guidance,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });
}
