import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { ROOT, listProfiles, pathExists } from "./lib.mjs";

const errors = [];
const skillRoot = path.join(ROOT, "skills");
const skillDirs = (await readdir(skillRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const values = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    values[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return values;
}

for (const dir of skillDirs) {
  const file = path.join(skillRoot, dir, "SKILL.md");
  if (!(await pathExists(file))) {
    errors.push(`${dir}: missing SKILL.md`);
    continue;
  }
  const text = await readFile(file, "utf8");
  const fm = parseFrontmatter(text);
  if (!fm) {
    errors.push(`${dir}: missing YAML frontmatter`);
    continue;
  }
  if (fm.name !== dir) errors.push(`${dir}: frontmatter name must match directory name`);
  if (!fm.description || fm.description.length < 40) errors.push(`${dir}: description is missing or too vague`);
  if (fm.description?.length > 1024) errors.push(`${dir}: description exceeds 1024 characters`);
  if (!/^harnesscraft-[a-z0-9-]+$/.test(dir)) errors.push(`${dir}: skill id must use HarnessCraft kebab-case namespace`);
}

const allowedTools = new Set(["hc_repo_context", "hc_search_web"]);
const profiles = await listProfiles();
for (const profile of profiles) {
  if (!profile.id) errors.push("profile without id");
  for (const skill of profile.skills ?? []) {
    if (!skillDirs.includes(skill)) errors.push(`${profile.id}: unknown skill '${skill}'`);
  }
  for (const tool of profile.pi?.tools ?? []) {
    if (!allowedTools.has(tool)) errors.push(`${profile.id}: unknown Pi tool '${tool}'`);
  }
}

const packageJson = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
for (const extension of packageJson.pi?.extensions ?? []) {
  if (!(await pathExists(path.join(ROOT, extension)))) errors.push(`package.json: missing Pi extension '${extension}'`);
}

const forbiddenNeedles = ["/home/hazem", "C:\\Users\\Hazem", "demo-iq", "demo-eg"];
for (const dir of skillDirs) {
  const text = await readFile(path.join(skillRoot, dir, "SKILL.md"), "utf8");
  for (const needle of forbiddenNeedles) {
    if (text.includes(needle)) errors.push(`${dir}: contains project/user-specific value '${needle}'`);
  }
}

if (errors.length) {
  console.error("HarnessCraft validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Validated ${skillDirs.length} skills and ${profiles.length} profiles.`);
