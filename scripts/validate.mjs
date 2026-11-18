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
  const match = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n/);
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
  // Agent Skills spec: 1-64 chars of a-z, 0-9 and single hyphens, no leading or trailing hyphen.
  if (dir.length > 64 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(dir)) errors.push(`${dir}: name breaks the Agent Skills naming rules`);
  if (!dir.startsWith("harnesscraft-")) errors.push(`${dir}: skill id must use the harnesscraft- namespace`);
}

async function listMarkdown(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort();
}

// A heading followed directly by a heading of the same or higher level has no content of its own.
function emptySections(text) {
  const headings = [];
  let fence = null;
  for (const line of text.split(/\r?\n/)) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    // A fence closes only on a marker of the same character that is at least as long as the opener.
    if (marker && (!fence || (marker[0] === fence[0] && marker.length >= fence.length))) {
      fence = fence ? null : marker;
      continue;
    }
    if (fence || !line.trim()) continue;
    const match = /^(#{1,6})\s+(.*)$/.exec(line);
    headings.push(match ? { level: match[1].length, title: match[2].trim() } : null);
  }
  return headings
    .map((current, i) => {
      const next = headings[i + 1];
      return current && (i + 1 === headings.length || (next && next.level <= current.level)) ? current.title : null;
    })
    .filter(Boolean);
}

for (const dir of skillDirs) {
  for (const file of await listMarkdown(path.join(skillRoot, dir))) {
    const rel = path.relative(skillRoot, file);
    const text = await readFile(file, "utf8");
    for (const title of emptySections(text)) errors.push(`${rel}: section '${title}' is empty`);
    for (const [, reference] of text.matchAll(/`(references\/[^`\s#]+)[^`\s]*`/g)) {
      if (!(await pathExists(path.join(skillRoot, dir, reference)))) errors.push(`${rel}: references missing file '${reference}'`);
    }
  }
}

// Profile tool names are honoured only where the Pi entry point wires them with `tools.has("...")`.
const piEntrySource = await readFile(path.join(ROOT, "extensions", "pi", "index.ts"), "utf8");
const allowedTools = new Set([...piEntrySource.matchAll(/tools\.has\("([^"]+)"\)/g)].map(([, name]) => name));
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

// Personal home directories on Linux, macOS and Windows.
// Placeholders such as /home/<user>/ are allowed; Windows paths match with single or JSON-escaped backslashes.
const localPathPatterns = [/\/home\/[^/\s<>]+/, /\/Users\/[^/\s<>]+/, /\b[A-Za-z]:\\{1,2}Users\\/i];
// Project-specific terms stay out of the repository: list them one per line in the gitignored .forbidden-terms file.
const forbiddenTermsFile = path.join(ROOT, ".forbidden-terms");
const forbiddenTerms = (await pathExists(forbiddenTermsFile))
  ? (await readFile(forbiddenTermsFile, "utf8")).split("\n").map((term) => term.trim()).filter(Boolean)
  : [];
for (const dir of skillDirs) {
  for (const file of await listMarkdown(path.join(skillRoot, dir))) {
    const rel = path.relative(skillRoot, file);
    const text = await readFile(file, "utf8");
    for (const pattern of localPathPatterns) {
      const match = text.match(pattern);
      if (match) errors.push(`${rel}: contains a local path '${match[0]}'`);
    }
    for (const term of forbiddenTerms) {
      if (text.includes(term)) errors.push(`${rel}: contains project-specific term '${term}'`);
    }
  }
}

if (errors.length) {
  console.error("HarnessCraft validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Validated ${skillDirs.length} skills and ${profiles.length} profiles.`);
