import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { registerRepoContext } from "./repo-context.ts";
import { registerWebSearch } from "./web-search.ts";
import { registerSafetyGates } from "./safety-gates.ts";

type Profile = {
  id: string;
  pi?: {
    tools?: string[];
    safetyGate?: boolean;
  };
};

function readJson(url: URL): Profile | null {
  try {
    return JSON.parse(readFileSync(url, "utf8")) as Profile;
  } catch {
    return null;
  }
}

function loadProfile(): Profile {
  const selected = readJson(new URL("./selected-profile.json", import.meta.url));
  const requested = (process.env.HARNESSCRAFT_PROFILE || selected?.id || "balanced")
    .trim()
    .toLowerCase();

  const packaged = readJson(new URL(`../../profiles/${requested}.json`, import.meta.url));
  if (packaged) return packaged;
  if (selected && selected.id === requested) return selected;
  if (selected) return selected;

  throw new Error(
    `HarnessCraft profile '${requested}' is unavailable. Reinstall the Pi adapter or set HARNESSCRAFT_PROFILE to an installed profile.`,
  );
}

export default function harnessCraft(pi: ExtensionAPI) {
  const profile = loadProfile();
  const tools = new Set(profile.pi?.tools ?? []);

  if (tools.has("hc_repo_context")) registerRepoContext(pi);
  if (tools.has("hc_search_web")) registerWebSearch(pi);
  if (profile.pi?.safetyGate !== false) registerSafetyGates(pi);
}
