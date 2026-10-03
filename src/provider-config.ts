import { homedir } from "node:os";
import path from "node:path";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";

export type ProviderName = "openai-compatible" | "anthropic";
export interface StoredProviderConfig { provider: ProviderName; baseUrl: string; model: string }
export interface ProviderConfig extends StoredProviderConfig { apiKey: string }

const DEFAULTS: Record<ProviderName, Omit<StoredProviderConfig, "provider">> = {
  "openai-compatible": { baseUrl: "https://api.openai.com/v1", model: "gpt-5-mini" },
  anthropic: { baseUrl: "https://api.anthropic.com/v1", model: "claude-sonnet-4-5" },
};

export function configFilePath(env: NodeJS.ProcessEnv = process.env): string {
  const root = env.XDG_CONFIG_HOME || env.APPDATA || path.join(env.HOME || homedir(), ".config");
  return path.join(root, "pardraverse", "provider.json");
}

export function validateProvider(value: string): ProviderName {
  if (value !== "openai-compatible" && value !== "anthropic") throw new Error(`Invalid provider '${value}'. Use openai-compatible or anthropic.`);
  return value;
}

export function validateBaseUrl(value: string): string {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("Invalid base URL. Use an absolute http(s) URL."); }
  const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && local)) throw new Error("Base URL must use HTTPS (HTTP is allowed only for localhost).");
  if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("Base URL must not contain credentials, query parameters, or fragments.");
  return value.replace(/\/$/, "");
}

export async function readStoredConfig(file = configFilePath()): Promise<StoredProviderConfig | undefined> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as Partial<StoredProviderConfig>;
    if (!parsed.provider || !parsed.baseUrl || !parsed.model) throw new Error("Provider config is incomplete.");
    return { provider: validateProvider(parsed.provider), baseUrl: validateBaseUrl(parsed.baseUrl), model: parsed.model };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw new Error(`Invalid provider config at ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function saveStoredConfig(config: StoredProviderConfig, file = configFilePath()): Promise<void> {
  validateProvider(config.provider); validateBaseUrl(config.baseUrl);
  if (!config.model.trim()) throw new Error("Model must not be empty.");
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify({ provider: config.provider, baseUrl: config.baseUrl, model: config.model }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, file);
  } finally {
    await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

export async function loadProviderConfig(env: NodeJS.ProcessEnv = process.env, file = configFilePath(env)): Promise<ProviderConfig> {
  const stored = await readStoredConfig(file);
  const provider = validateProvider(env.PRAC_AI_PROVIDER ?? stored?.provider ?? "openai-compatible");
  const baseUrl = validateBaseUrl(env.PRAC_AI_BASE_URL ?? stored?.baseUrl ?? DEFAULTS[provider].baseUrl);
  const model = env.PRAC_AI_MODEL ?? stored?.model ?? DEFAULTS[provider].model;
  const apiKey = env.PRAC_AI_API_KEY ?? (provider === "anthropic" ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY) ?? "";
  if (!apiKey) throw new Error(`No API key configured for ${provider}. Set PRAC_AI_API_KEY (or ${provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"}) in the environment; provider setup never stores keys.`);
  return { provider, baseUrl, model, apiKey };
}

export function redactSecrets(value: string, secrets: string[] = []): string {
  let result = value;
  for (const secret of secrets.filter(Boolean)) result = result.split(secret).join("[REDACTED]");
  return result.replace(/(api[-_ ]?key|authorization|x-api-key)(["'=:\s]+)([^\s,"'}]+)/gi, "$1$2[REDACTED]");
}

export function defaultsFor(provider: ProviderName): StoredProviderConfig { return { provider, ...DEFAULTS[provider] }; }
