#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  HARNESS_TARGETS,
  ROOT,
  detectHarnesses,
  installDirectory,
  listProfiles,
  loadProfile,
  loadState,
  parseHarnessList,
  resolvePiExtensionRoot,
  resolveSkillRoot,
  saveState,
  uninstallDirectory,
} from "./lib.mjs";

async function terminalLogo() {
  try {
    return (await readFile(new URL("../assets/brand/terminal-scarab.txt", import.meta.url), "utf8")).trimEnd();
  } catch {
    return "HarnessCraft";
  }
}

async function printIdentity() {
  console.log(await terminalLogo());
  console.log("\nHarnessCraft — portable engineering judgment for AI coding harnesses.\n");
}

async function usage() {
  await printIdentity();
  console.log(`Usage:
  harnesscraft list
  harnesscraft doctor
  harnesscraft install [--harness agents|codex|claude|cursor|opencode|pi|common] [--profile balanced] [--scope global|project] [--dry-run] [--force]
  harnesscraft uninstall [--harness ...] [--scope global|project] [--dry-run] [--force]

Notes:
  - Multiple harnesses can be comma-separated.
  - 'common' expands to codex,claude,cursor,opencode,pi.
  - Pi receives both skills and the Pi adapter. Other harnesses receive skills only.
  - Existing modified destinations are preserved unless --force is supplied.
`);
}

function parseArgs(argv) {
  const args = { command: argv[0] ?? "help", harness: undefined, profile: "balanced", scope: "global", force: false, dryRun: false };
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--force") args.force = true;
    else if (token === "--dry-run") args.dryRun = true;
    else if (token === "--harness") args.harness = argv[++i];
    else if (token.startsWith("--harness=")) args.harness = token.slice("--harness=".length);
    else if (token === "--profile") args.profile = argv[++i];
    else if (token.startsWith("--profile=")) args.profile = token.slice("--profile=".length);
    else if (token === "--scope") args.scope = argv[++i];
    else if (token.startsWith("--scope=")) args.scope = token.slice("--scope=".length);
    else throw new Error(`Unknown argument '${token}'.`);
  }
  if (!["global", "project"].includes(args.scope)) throw new Error("--scope must be global or project.");
  return args;
}

function logResult(prefix, result) {
  const suffix = result.message ? ` — ${result.message}` : "";
  console.log(`${prefix} ${result.status.padEnd(13)} ${result.destination}${suffix}`);
}

async function commandList() {
  const profiles = await listProfiles();
  console.log("Profiles:\n");
  for (const profile of profiles) {
    console.log(`${profile.id.padEnd(10)} ${profile.description}`);
    console.log(`           skills: ${profile.skills.join(", ")}`);
    console.log(`           pi: ${(profile.pi?.tools ?? []).join(", ") || "no extra tools"}; safety gate=${profile.pi?.safetyGate !== false}`);
  }
  console.log(`\nHarness targets: ${Object.keys(HARNESS_TARGETS).join(", ")}`);
}

async function commandDoctor() {
  const profiles = await listProfiles();
  const detected = await detectHarnesses();
  let ok = true;

  console.log(`HarnessCraft root: ${ROOT}`);
  console.log(`Node: ${process.version}`);
  console.log(`Profiles: ${profiles.map((p) => p.id).join(", ")}`);
  for (const profile of profiles) {
    for (const skill of profile.skills) {
      const file = path.join(ROOT, "skills", skill, "SKILL.md");
      try { await readFile(file, "utf8"); }
      catch { ok = false; console.log(`MISSING: ${file}`); }
    }
  }
  console.log("Detected harness config directories:");
  for (const [id, present] of Object.entries(detected)) console.log(`  ${present ? "✓" : "·"} ${id}`);
  console.log(ok ? "Doctor: OK" : "Doctor: problems found");
  if (!ok) process.exitCode = 1;
}

async function commandInstall(args) {
  const profile = await loadProfile(args.profile);
  const harnesses = parseHarnessList(args.harness);
  const state = await loadState(args.scope);

  for (const harness of harnesses) {
    const skillRoot = resolveSkillRoot(harness, args.scope);

    const staleSkills = Object.entries(state.installs)
      .filter(([, entry]) =>
        entry.kind === "skill" &&
        entry.harness === harness &&
        entry.scope === args.scope &&
        !profile.skills.includes(entry.skill),
      )
      .map(([key, entry]) => ({ key, entry }));

    for (const { key, entry } of staleSkills) {
      const destination = entry.destination || path.join(skillRoot, entry.skill);
      const result = await uninstallDirectory({
        destination,
        state,
        stateKey: key,
        force: args.force,
        dryRun: args.dryRun,
      });
      logResult(`[${harness}:profile]`, result);
    }

    for (const skill of profile.skills) {
      const source = path.join(ROOT, "skills", skill);
      const destination = path.join(skillRoot, skill);
      const stateKey = `skill:${destination}`;
      const result = await installDirectory({
        source,
        destination,
        state,
        stateKey,
        force: args.force,
        dryRun: args.dryRun,
        metadata: { kind: "skill", harness, scope: args.scope, profile: profile.id, skill },
      });
      logResult(`[${harness}]`, result);
    }

    if (harness === "pi") {
      const source = path.join(ROOT, "extensions", "pi");
      const destination = resolvePiExtensionRoot(args.scope);
      const stateKey = `extension:${destination}`;
      const result = await installDirectory({
        source,
        destination,
        state,
        stateKey,
        force: args.force,
        dryRun: args.dryRun,
        metadata: { kind: "pi-extension", harness, scope: args.scope, profile: profile.id },
        afterCopy: async (dest) => {
          await mkdir(dest, { recursive: true });
          await writeFile(path.join(dest, "selected-profile.json"), `${JSON.stringify(profile, null, 2)}\n`, "utf8");
        },
      });
      logResult("[pi-tools]", result);
    }
  }

  if (!args.dryRun) await saveState(args.scope, state);
}

async function commandUninstall(args) {
  const harnesses = parseHarnessList(args.harness);
  const state = await loadState(args.scope);

  for (const harness of harnesses) {
    const skillRoot = resolveSkillRoot(harness, args.scope);
    const matching = Object.entries(state.installs)
      .filter(([, entry]) => entry.kind === "skill" && entry.harness === harness && entry.scope === args.scope)
      .map(([key, entry]) => ({ key, entry }));

    for (const { key, entry } of matching) {
      const destination = entry.destination || path.join(skillRoot, entry.skill);
      const result = await uninstallDirectory({ destination, state, stateKey: key, force: args.force, dryRun: args.dryRun });
      logResult(`[${harness}]`, result);
    }

    if (harness === "pi") {
      const destination = resolvePiExtensionRoot(args.scope);
      const stateKey = `extension:${destination}`;
      const result = await uninstallDirectory({ destination, state, stateKey, force: args.force, dryRun: args.dryRun });
      logResult("[pi-tools]", result);
    }
  }

  if (!args.dryRun) await saveState(args.scope, state);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (["help", "--help", "-h"].includes(args.command)) return usage();
  if (args.command === "list") return commandList();
  if (args.command === "doctor") return commandDoctor();
  if (args.command === "install") return commandInstall(args);
  if (args.command === "uninstall") return commandUninstall(args);
  throw new Error(`Unknown command '${args.command}'.`);
}

main().catch((error) => {
  console.error(`HarnessCraft error: ${error.message}`);
  process.exitCode = 1;
});
