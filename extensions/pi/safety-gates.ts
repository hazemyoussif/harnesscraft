import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Risk = { label: string; reason: string };

export function detectRisk(command: string): Risk | null {
  const c = command.trim();
  if (/\bgit\s+push\b[^\n]*(--force-with-lease|--force|-f)\b/i.test(c)) {
    return { label: "Force push", reason: "rewrites a remote branch and can discard shared history" };
  }
  if (/\bgit\s+reset\s+--hard\b/i.test(c)) {
    return { label: "Hard reset", reason: "can discard uncommitted or local commit state" };
  }
  if (/\bgit\s+clean\b[^\n]*\s-[^\s]*f/i.test(c)) {
    return { label: "Destructive Git clean", reason: "can permanently delete untracked files" };
  }
  if (/\bgit\s+merge(?:\s|$)/i.test(c) && !/\bgit\s+merge\s+--abort\b/i.test(c)) {
    return { label: "Git merge", reason: "changes branch and should be explicitly authorized" };
  }
  if (/\bgit\s+rebase\b/i.test(c) && !/\bgit\s+rebase\s+--abort\b/i.test(c)) {
    return { label: "Git rebase", reason: "rewrites commit history or changes shared branch state" };
  }
  if (/\bgh\s+pr\s+merge\b/i.test(c)) {
    return { label: "Pull-request merge", reason: "merges changes into the target branch" };
  }
  if (/\brm\s+-[^\n]*r[^\n]*f|\rm\s+-[^\n]*f[^\n]*r/i.test(c)) {
    return { label: "Recursive forced deletion", reason: "can permanently remove files without recovery" };
  }
  if (/\b(drop\s+(database|schema|table)|truncate\s+table)\b/i.test(c)) {
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
  if (/\bdocker\s+system\s+prune\b[^\n]*(-a|--all)/i.test(c)) {
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
