import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

type Provider = "brave" | "tavily" | "searxng";

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  score?: number;
};

function availableProviders(): Provider[] {
  const providers: Provider[] = [];
  if (process.env.BRAVE_SEARCH_API_KEY) providers.push("brave");
  if (process.env.TAVILY_API_KEY) providers.push("tavily");
  if (process.env.SEARXNG_URL) providers.push("searxng");
  return providers;
}

function chooseProvider(requested?: string): Provider {
  if (requested) {
    if (!["brave", "tavily", "searxng"].includes(requested)) {
      throw new Error(`Unsupported provider: ${requested}`);
    }
    const provider = requested as Provider;
    if (!availableProviders().includes(provider)) {
      throw new Error(`Provider ${provider} is not configured in the environment.`);
    }
    return provider;
  }
  const first = availableProviders()[0];
  if (!first) {
    throw new Error(
      "No HarnessCraft search provider is configured. Set BRAVE_SEARCH_API_KEY, TAVILY_API_KEY, or SEARXNG_URL.",
    );
  }
  return first;
}

async function braveSearch(query: string, maxResults: number, signal?: AbortSignal): Promise<SearchResult[]> {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(maxResults));
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY || "",
    },
  });
  if (!response.ok) throw new Error(`Brave Search failed with HTTP ${response.status}`);
  const data = (await response.json()) as any;
  return (data.web?.results ?? []).slice(0, maxResults).map((item: any) => ({
    title: String(item.title ?? ""),
    url: String(item.url ?? ""),
    snippet: String(item.description ?? ""),
  }));
}

async function tavilySearch(query: string, maxResults: number, signal?: AbortSignal): Promise<SearchResult[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_answer: false,
      include_raw_content: false,
    }),
  });
  if (!response.ok) throw new Error(`Tavily Search failed with HTTP ${response.status}`);
  const data = (await response.json()) as any;
  return (data.results ?? []).slice(0, maxResults).map((item: any) => ({
    title: String(item.title ?? ""),
    url: String(item.url ?? ""),
    snippet: String(item.content ?? ""),
    score: typeof item.score === "number" ? item.score : undefined,
  }));
}

async function searxngSearch(query: string, maxResults: number, signal?: AbortSignal): Promise<SearchResult[]> {
  const base = process.env.SEARXNG_URL;
  if (!base) throw new Error("SEARXNG_URL is not configured.");
  const url = new URL("search", base.endsWith("/") ? base : `${base}/`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`SearXNG search failed with HTTP ${response.status}`);
  const data = (await response.json()) as any;
  return (data.results ?? []).slice(0, maxResults).map((item: any) => ({
    title: String(item.title ?? ""),
    url: String(item.url ?? ""),
    snippet: String(item.content ?? ""),
    score: typeof item.score === "number" ? item.score : undefined,
  }));
}

export function registerWebSearch(pi: ExtensionAPI) {
  pi.registerTool({
    name: "hc_search_web",
    label: "HarnessCraft Web Search",
    description:
      "Search the public web through a configured Brave, Tavily, or SearXNG provider and return normalized compact results.",
    promptSnippet: "Search the web with a configured provider when current external information is needed",
    promptGuidelines: [
      "Use hc_search_web only when current/external information materially improves the task; do not search reflexively for repository-local questions.",
      "Treat search snippets as discovery evidence; fetch or verify authoritative sources before making high-confidence claims when the task requires it.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Search query." }),
      provider: Type.Optional(
        Type.String({ description: "Optional provider: brave, tavily, or searxng. Defaults to the first configured provider." }),
      ),
      max_results: Type.Optional(
        Type.Integer({ minimum: 1, maximum: 10, description: "Maximum results. Defaults to 5." }),
      ),
    }),
    async execute(_toolCallId, params, signal) {
      const provider = chooseProvider(params.provider);
      const maxResults = params.max_results ?? 5;
      let results: SearchResult[];
      if (provider === "brave") results = await braveSearch(params.query, maxResults, signal);
      else if (provider === "tavily") results = await tavilySearch(params.query, maxResults, signal);
      else results = await searxngSearch(params.query, maxResults, signal);

      const payload = { provider, query: params.query, results };
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        details: { provider, count: results.length },
      };
    },
  });
}
