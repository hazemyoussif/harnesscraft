import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Risk = { label: string; reason: string };

// Option tokens of one command's arguments, up to a `--` that ends options.
function optionFlags(args: string): string[] {
  const flags: string[] = [];
  for (const token of args.trim().split(/\s+/)) {
    if (token === "--") break;
    if (token.startsWith("-")) flags.push(token);
  }
  return flags;
}

// True when any `rm` in the command has both a recursive and a force flag, in any order or grouping.
function isRecursiveForcedRm(command: string): boolean {
  for (const segment of command.split(/&&|\|\||[;|\n]/)) {
    const match = segment.match(/(?:^|[\s"'`(/\\])rm\s+(.*)$/);
    if (!match) continue;
    const flags = optionFlags(match[1]);
    const recursive = flags.some((flag) => flag === "--recursive" || /^-[a-zA-Z]*[rR]/.test(flag));
    const force = flags.some((flag) => flag === "--force" || /^-[a-zA-Z]*f/.test(flag));
    if (recursive && force) return true;
  }
  return false;
}

// True when any `git restore` in the command touches the working tree, i.e. is not limited to --staged.
function isWorktreeRestore(command: string): boolean {
  for (const [, args] of command.matchAll(/\bgit\s+restore\b([^\n;&|]*)/g)) {
    const flags = optionFlags(args);
    const staged = flags.some((flag) => flag === "--staged" || flag === "-S");
    const worktree = flags.some((flag) => flag === "--worktree" || flag === "-W");
    if (!staged || worktree) return true;
  }
  return false;
}

// True when any `git branch` in the command deletes with force: -D, or delete and force flags in any grouping.
function isForcedBranchDelete(command: string): boolean {
  for (const [, args] of command.matchAll(/\bgit\s+branch\b([^\n;&|]*)/g)) {
    const flags = optionFlags(args);
    const forcedDelete = flags.some((flag) => /^-[a-zA-Z]*D/.test(flag));
    const remove = flags.some((flag) => flag === "--delete" || /^-[a-zA-Z]*d/.test(flag));
    const force = flags.some((flag) => flag === "--force" || /^-[a-zA-Z]*f/.test(flag));
    if (forcedDelete || (remove && force)) return true;
  }
  return false;
}

// True when any `git checkout` restores files rather than switching branches: a tree-ish plus paths,
// or an argument that looks like a file (has an extension or a glob). Branch creation is left alone.
function isPathCheckout(command: string): boolean {
  for (const [, args] of command.matchAll(/\bgit\s+checkout\b([^\n;&|]*)/g)) {
    const tokens = args.trim().split(/\s+/).filter(Boolean);
    if (tokens.some((token) => ["-b", "-B", "--orphan"].includes(token))) continue;
    const positional = tokens.filter((token) => !token.startsWith("-"));
    if (positional.length > 1 || positional.some((token) => /\.[A-Za-z]\w*$/.test(token) || token.includes("*"))) return true;
  }
  return false;
}

// Drops git's global options so each check sees the subcommand: `git -C repo push` reads as `git push`.
function withoutGitGlobalOptions(command: string): string {
  return command.replace(
    /\bgit((?:\s+(?:-[Cc]\s+\S+|--(?:git-dir|work-tree|namespace|config-env)(?:=\S+|\s+\S+)|--exec-path(?:=\S+)?|--no-pager|--paginate|-[pP]|--bare|--no-replace-objects|--no-optional-locks|--(?:literal|glob|noglob|icase)-pathspecs))+)(?=\s)/g,
    "git",
  );
}

export function detectRisk(command: string): Risk | null {
  const c = withoutGitGlobalOptions(command.trim());
  if (/\bgit\s+push\b[^\n;&|]*\s(--force(-with-lease|-if-includes)?(=\S*)?|-[a-zA-Z]*f[a-zA-Z]*|["']?\+\S+)(?=\s|$)/i.test(c)) {
    return { label: "Force push", reason: "rewrites a remote branch and can discard shared history" };
  }
  if (/\bgit\s+push\b[^\n;&|]*\s(--delete|-d|--mirror|--prune|:\S+)(?=\s|$)/.test(c)) {
    return { label: "Remote ref deletion", reason: "deletes branches or tags on the remote" };
  }
  if (/\bgit\s+reset\s+--hard\b/i.test(c)) {
    return { label: "Hard reset", reason: "can discard uncommitted or local commit state" };
  }
  if (/\bgit\s+clean\b[^\n;&|]*\s-[^\s]*f/i.test(c)) {
    return { label: "Destructive Git clean", reason: "can permanently delete untracked files" };
  }
  if (
    /\bgit\s+checkout\b[^\n;&|]*\s(--|\.|-f|--force)(?=\s|$)/.test(c) ||
    isPathCheckout(c) ||
    isWorktreeRestore(c) ||
    /\bgit\s+switch\b[^\n;&|]*\s(--discard-changes|-f|--force)(?=\s|$)/.test(c)
  ) {
    return { label: "Discard uncommitted changes", reason: "overwrites working-tree edits that Git cannot recover" };
  }
  if (/\bgit\s+stash\s+(drop|clear)\b/.test(c)) {
    return { label: "Stash deletion", reason: "deletes stashed work" };
  }
  if (isForcedBranchDelete(c)) {
    return { label: "Forced branch deletion", reason: "deletes a branch even when its commits are not merged" };
  }
  if (/\bgit\s+merge(?:\s|$)/i.test(c) && !/\bgit\s+merge\s+--abort\b/i.test(c)) {
    return { label: "Git merge", reason: "changes branch and should be explicitly authorized" };
  }
  if (
    (/\bgit\s+rebase\b/i.test(c) && !/\bgit\s+rebase\s+--abort\b/i.test(c)) ||
    /\bgit\s+pull\b[^\n;&|]*\s(--rebase(?!=false)|-r)(?=[\s=]|$)/.test(c)
  ) {
    return { label: "Git rebase", reason: "rewrites commit history or changes shared branch state" };
  }
  if (/\bgh\s+pr\s+merge\b/i.test(c)) {
    return { label: "Pull-request merge", reason: "merges changes into the target branch" };
  }
  if (isRecursiveForcedRm(c)) {
    return { label: "Recursive forced deletion", reason: "can permanently remove files without recovery" };
  }
  if (
    /\b(drop\s+(database|schema|table)|truncate\s+table)\b/i.test(c) ||
    // SQL TRUNCATE without TABLE: only when the statement visibly ends, so `truncate -s 0 file` and prose stay out.
    /\btruncate\s+(?:only\s+)?[\w."]+(?:\s*,\s*[\w."]+)*\s*(?:;|$|["']|\s+(?:cascade|restrict|restart|continue)\b)/i.test(c) ||
    /\b(rails|rake)\s+db:(drop|reset|purge|migrate:reset|schema:load|structure:load|truncate_all|seed:replant)\b/.test(c) ||
    /\bprisma\s+migrate\s+reset\b/.test(c) ||
    /\bdelete\s+from\s+[^\s;]+(?![^;]*\bwhere\b)/i.test(c)
  ) {
    return { label: "Destructive database operation", reason: "can irreversibly remove production or local data" };
  }
  if (/\bterraform\s+destroy\b/i.test(c)) {
    return { label: "Infrastructure destroy", reason: "can delete provisioned infrastructure" };
  }
  if (/\bkubectl\s+delete\s+(namespace|ns)\b/i.test(c)) {
    return { label: "Kubernetes namespace deletion", reason: "can remove an entire environment namespace" };
  }
  if (/\b(npm|pnpm)\s+publish\b|\byarn\s+npm\s+publish\b/i.test(c)) {
    return { label: "Package publish", reason: "publishes an externally visible release" };
  }
  if (/\bdocker\s+system\s+prune\b[^\n;&|]*\s(-[a-zA-Z]*a[a-zA-Z]*|--all)(?=\s|$)/.test(c)) {
    return { label: "Docker destructive prune", reason: "can remove images, containers, networks, and build cache" };
  }
  return null;
}

export function registerSafetyGates(pi: ExtensionAPI) {
  pi.on("tool_call", async (event: any, ctx) => {
    if (event?.toolName !== "bash") return undefined;
    const command = typeof event?.input?.command === "string" ? event.input.command : "";
    if (!command) return undefined;

    const risk = detectRisk(command);
    if (!risk) return undefined;

    const approved = await ctx.ui.confirm(
      `HarnessCraft: ${risk.label}`,
      `${risk.reason}.\n\nCommand:\n${command}\n\nAllow this operation?`,
    );
    if (!approved) {
      return { block: true, reason: `Blocked by user: ${risk.label}` };
    }
    return undefined;
  });
}
