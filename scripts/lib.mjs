import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const HARNESS_TARGETS = {
  agents: {
    global: (home) => path.join(home, ".agents", "skills"),
    project: (cwd) => path.join(cwd, ".agents", "skills"),
  },
  codex: {
    global: (home) => path.join(home, ".codex", "skills"),
    project: (cwd) => path.join(cwd, ".codex", "skills"),
  },
  claude: {
    global: (home) => path.join(home, ".claude", "skills"),
    project: (cwd) => path.join(cwd, ".claude", "skills"),
  },
  cursor: {
    global: (home) => path.join(home, ".cursor", "skills"),
    project: (cwd) => path.join(cwd, ".cursor", "skills"),
  },
  opencode: {
    global: (home) => path.join(home, ".config", "opencode", "skills"),
    project: (cwd) => path.join(cwd, ".opencode", "skills"),
  },
  pi: {
    global: (home) => path.join(home, ".pi", "agent", "skills"),
    project: (cwd) => path.join(cwd, ".pi", "skills"),
  },
};

export function resolveSkillRoot(harness, scope, { cwd = process.cwd(), home = os.homedir() } = {}) {
  const target = HARNESS_TARGETS[harness];
  if (!target) throw new Error(`Unsupported harness '${harness}'.`);
  if (scope === "project") return target.project(cwd);
  if (scope === "global") return target.global(home);
  throw new Error(`Unsupported scope '${scope}'. Use global or project.`);
}

export function resolvePiExtensionRoot(scope, { cwd = process.cwd(), home = os.homedir() } = {}) {
  if (scope === "project") return path.join(cwd, ".pi", "extensions", "harnesscraft");
  if (scope === "global") return path.join(home, ".pi", "agent", "extensions", "harnesscraft");
  throw new Error(`Unsupported scope '${scope}'. Use global or project.`);
}

export function statePath(scope, { cwd = process.cwd(), home = os.homedir() } = {}) {
  return scope === "project"
    ? path.join(cwd, ".harnesscraft", "state.json")
    : path.join(home, ".harnesscraft", "state.json");
}

export async function loadProfile(id) {
  const file = path.join(ROOT, "profiles", `${id}.json`);
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`Unknown profile '${id}'.`);
    throw error;
  }
}

export async function listProfiles() {
  const files = (await readdir(path.join(ROOT, "profiles"))).filter((name) => name.endsWith(".json")).sort();
  return Promise.all(files.map((name) => loadProfile(name.replace(/\.json$/, ""))));
}

export async function pathExists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function hashFile(file, hash, relative) {
  hash.update(relative);
  hash.update("\0");
  hash.update(await readFile(file));
  hash.update("\0");
}

export async function hashDirectory(root) {
  const hash = createHash("sha256");

  async function walk(current, prefix = "") {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const rel = prefix ? path.join(prefix, entry.name) : entry.name;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full, rel);
      else if (entry.isFile()) await hashFile(full, hash, rel);
    }
  }

  await walk(root);
  return hash.digest("hex");
}

export async function loadState(scope, opts = {}) {
  const file = statePath(scope, opts);
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    return { version: 1, installs: {}, ...parsed, installs: parsed.installs ?? {} };
  } catch (error) {
    if (error?.code === "ENOENT") return { version: 1, installs: {} };
    throw error;
  }
}

export async function saveState(scope, state, opts = {}) {
  const file = statePath(scope, opts);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function installDirectory({ source, destination, state, stateKey, metadata, force = false, dryRun = false, afterCopy }) {
  const sourceHash = await hashDirectory(source);
  const exists = await pathExists(destination);
  const previous = state.installs[stateKey];

  if (exists) {
    const currentHash = await hashDirectory(destination);
    if (!afterCopy && currentHash === sourceHash) {
      if (!dryRun) {
        state.installs[stateKey] = { ...metadata, destination, hash: currentHash, installedAt: previous?.installedAt ?? new Date().toISOString() };
      }
      return { status: "unchanged", destination };
    }
    const ownedAndUnmodified = previous && previous.hash === currentHash;
    if (!ownedAndUnmodified && !force) {
      return {
        status: "conflict",
        destination,
        message: "Destination exists and differs from the last HarnessCraft-installed hash; preserving user changes.",
      };
    }
  }

  if (dryRun) return { status: exists ? "would-update" : "would-install", destination };

  await mkdir(path.dirname(destination), { recursive: true });
  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, { recursive: true });
  if (afterCopy) await afterCopy(destination);
  const installedHash = await hashDirectory(destination);
  state.installs[stateKey] = {
    ...metadata,
    destination,
    hash: installedHash,
    installedAt: new Date().toISOString(),
  };
  return { status: exists ? "updated" : "installed", destination };
}

export async function uninstallDirectory({ destination, state, stateKey, force = false, dryRun = false }) {
  const previous = state.installs[stateKey];
  if (!previous) return { status: "untracked", destination };
  if (!(await pathExists(destination))) {
    if (!dryRun) delete state.installs[stateKey];
    return { status: "missing", destination };
  }

  const currentHash = await hashDirectory(destination);
  if (currentHash !== previous.hash && !force) {
    return { status: "modified", destination, message: "Preserving modified installed files. Use --force to remove them." };
  }

  if (!dryRun) {
    await rm(destination, { recursive: true, force: true });
    delete state.installs[stateKey];
  }
  return { status: dryRun ? "would-remove" : "removed", destination };
}

export function parseHarnessList(value) {
  if (!value) return ["agents"];
  const requested = value.split(",").map((item) => item.trim()).filter(Boolean);
  const expanded = requested.flatMap((item) => item === "common" ? ["codex", "claude", "cursor", "opencode", "pi"] : [item]);
  const unique = [...new Set(expanded)];
  for (const harness of unique) {
    if (!HARNESS_TARGETS[harness]) throw new Error(`Unsupported harness '${harness}'.`);
  }
  return unique;
}

export async function detectHarnesses({ home = os.homedir() } = {}) {
  const checks = {
    codex: path.join(home, ".codex"),
    claude: path.join(home, ".claude"),
    cursor: path.join(home, ".cursor"),
    opencode: path.join(home, ".config", "opencode"),
    pi: path.join(home, ".pi", "agent"),
  };
  return Object.fromEntries(Object.entries(checks).map(([id, dir]) => [id, existsSync(dir)]));
}
