import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { ROOT } from "../scripts/lib.mjs";

const execFileAsync = promisify(execFile);

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

test("switching to a smaller profile removes stale unmodified skills", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "harnesscraft-profile-"));
  const cli = path.join(ROOT, "scripts", "harnesscraft.mjs");
  const env = { ...process.env, HOME: home };

  await execFileAsync(process.execPath, [cli, "install", "--harness", "codex", "--profile", "frontier"], { env });
  const skillRoot = path.join(home, ".codex", "skills");
  assert.equal(await exists(path.join(skillRoot, "harnesscraft-ai-engineering")), true);
  assert.equal(await exists(path.join(skillRoot, "harnesscraft-code-review")), true);

  await execFileAsync(process.execPath, [cli, "install", "--harness", "codex", "--profile", "local"], { env });

  assert.equal(await exists(path.join(skillRoot, "harnesscraft-engineering-core")), true);
  assert.equal(await exists(path.join(skillRoot, "harnesscraft-architecture")), true);
  assert.equal(await exists(path.join(skillRoot, "harnesscraft-safe-delivery")), true);
  assert.equal(await exists(path.join(skillRoot, "harnesscraft-ai-engineering")), false);
  assert.equal(await exists(path.join(skillRoot, "harnesscraft-code-review")), false);
});
