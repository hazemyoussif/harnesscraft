import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  installDirectory,
  loadProfile,
  parseHarnessList,
  resolvePiExtensionRoot,
  resolveSkillRoot,
  uninstallDirectory,
} from "../scripts/lib.mjs";

test("balanced profile exposes the expected core skills", async () => {
  const profile = await loadProfile("balanced");
  assert.equal(profile.id, "balanced");
  assert.ok(profile.skills.includes("harnesscraft-engineering-core"));
  assert.ok(profile.skills.includes("harnesscraft-safe-delivery"));
  assert.ok(profile.pi.tools.includes("hc_repo_context"));
});

test("portable and harness-specific destinations resolve deterministically", () => {
  const home = "/tmp/hc-home";
  const cwd = "/tmp/hc-project";
  assert.equal(resolveSkillRoot("agents", "global", { home, cwd }), "/tmp/hc-home/.agents/skills");
  assert.equal(resolveSkillRoot("codex", "project", { home, cwd }), "/tmp/hc-project/.codex/skills");
  assert.equal(resolvePiExtensionRoot("global", { home, cwd }), "/tmp/hc-home/.pi/agent/extensions/harnesscraft");
});

test("common harness alias expands without duplicates", () => {
  assert.deepEqual(parseHarnessList("common,codex"), ["codex", "claude", "cursor", "opencode", "pi"]);
});

test("installer preserves user-modified installed resources", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "harnesscraft-test-"));
  const source = path.join(temp, "source");
  const destination = path.join(temp, "dest");
  await mkdir(source, { recursive: true });
  await writeFile(path.join(source, "SKILL.md"), "v1\n");
  const state = { version: 1, installs: {} };
  const stateKey = `skill:${destination}`;

  const first = await installDirectory({
    source,
    destination,
    state,
    stateKey,
    metadata: { kind: "skill" },
  });
  assert.equal(first.status, "installed");

  await writeFile(path.join(destination, "SKILL.md"), "user modification\n");
  await writeFile(path.join(source, "SKILL.md"), "v2\n");

  const second = await installDirectory({
    source,
    destination,
    state,
    stateKey,
    metadata: { kind: "skill" },
  });
  assert.equal(second.status, "conflict");
  assert.equal(await readFile(path.join(destination, "SKILL.md"), "utf8"), "user modification\n");
});

test("uninstaller removes only an unmodified tracked resource", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "harnesscraft-test-"));
  const source = path.join(temp, "source");
  const destination = path.join(temp, "dest");
  await mkdir(source, { recursive: true });
  await writeFile(path.join(source, "SKILL.md"), "content\n");
  const state = { version: 1, installs: {} };
  const stateKey = `skill:${destination}`;

  await installDirectory({ source, destination, state, stateKey, metadata: { kind: "skill" } });
  const result = await uninstallDirectory({ destination, state, stateKey });
  assert.equal(result.status, "removed");
  assert.equal(state.installs[stateKey], undefined);
});

test("Pi safety gate source distinguishes consequential Git operations", async () => {
  const source = await readFile(new URL("../extensions/pi/safety-gates.ts", import.meta.url), "utf8");
  assert.match(source, /git\\s\+merge/);
  assert.match(source, /merge\\s\+--abort/);
  assert.match(source, /git\\s\+push/);
  assert.match(source, /force-with-lease/);
});
