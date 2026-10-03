import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface AiConfig {
  provider: "openai-compatible" | "anthropic";
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function loadAiConfig(env = process.env): AiConfig {
  const provider = env.PRAC_AI_PROVIDER ?? "openai-compatible";
  if (provider !== "openai-compatible" && provider !== "anthropic") {
    throw new Error(`Unsupported PRAC_AI_PROVIDER: ${provider}`);
  }
  const apiKey = env.PRAC_AI_API_KEY;
  if (!apiKey) throw new Error("PRAC_AI_API_KEY is not set. See .env.example.");
  return {
    provider,
    apiKey,
    baseUrl:
      env.PRAC_AI_BASE_URL ??
      (provider === "anthropic" ? "https://api.anthropic.com/v1" : "https://api.openai.com/v1"),
    model: env.PRAC_AI_MODEL ?? (provider === "anthropic" ? "claude-sonnet-4-5" : "gpt-5-mini"),
  };
}

export async function askAi(
  system: string,
  prompt: string,
  config = loadAiConfig(),
): Promise<string> {
  if (config.provider === "anthropic") {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1800,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}: ${await response.text()}`);
    const body = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    return body.content?.find((item) => item.type === "text")?.text ?? "";
  }

  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}: ${await response.text()}`);
  const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return body.choices?.[0]?.message?.content ?? "";
}

export const COACH_SYSTEM = `You are a deliberate-practice coach for programming and algorithms.
Never pretend code was executed. Prefer questions, invariants, counterexamples, complexity checks, and progressively stronger hints.
Do not give a complete solution unless the learner explicitly asks for one after attempting the problem.
Keep advice language-agnostic unless a language is supplied. Distinguish facts from inference.`;

export async function fetchPublicPage(url: string): Promise<{ title: string; text: string }> {
  let parsed = new URL(url);
  let response: Response | undefined;
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    await assertPublicUrl(parsed);
    response = await fetch(parsed, {
      redirect: "manual",
      headers: { "user-agent": "coding-prac/0.1 (+local learning tool)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect response had no location.");
    parsed = new URL(location, parsed);
    response = undefined;
  }
  if (!response) throw new Error("Too many redirects.");
  if (!response.ok) throw new Error(`Could not fetch URL (${response.status}).`);
  const html = (await response.text()).slice(0, 1_000_000);
  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? parsed.hostname);
  const text = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  ).slice(0, 30_000);
  return { title, text };
}

async function assertPublicUrl(url: URL): Promise<void> {
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
    throw new Error("Only public http(s) URLs without embedded credentials are supported.");
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost")) throw new Error("Private or local URLs are not supported.");
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private or local URLs are not supported.");
  }
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "::" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const ipv4 = mapped ?? (isIP(normalized) === 4 ? normalized : undefined);
  if (!ipv4) return false;
  const octets = ipv4.split(".").map(Number);
  const [a = 0, b = 0] = octets;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
