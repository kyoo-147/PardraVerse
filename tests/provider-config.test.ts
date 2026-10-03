import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { defaultsFor, loadProviderConfig, redactSecrets, readStoredConfig, saveStoredConfig, validateBaseUrl, validateProvider } from "../src/provider-config.js";

const env = (extra: NodeJS.ProcessEnv = {}) => ({ APPDATA: path.join(tmpdir(), "pardra-tests"), ...extra });

describe("provider configuration", () => {
  it("uses environment values over stored metadata", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "provider-")); const file = path.join(dir, "provider.json");
    await saveStoredConfig({ provider: "anthropic", baseUrl: "https://api.anthropic.com/v1", model: "stored" }, file);
    const result = await loadProviderConfig({ PRAC_AI_PROVIDER: "openai-compatible", PRAC_AI_BASE_URL: "https://example.test/v1", PRAC_AI_MODEL: "env", PRAC_AI_API_KEY: "secret" }, file);
    expect(result.provider).toBe("openai-compatible"); expect(result.model).toBe("env"); expect(result.baseUrl).toBe("https://example.test/v1");
  });
  it("rejects invalid providers and unsafe base URLs", () => {
    expect(() => validateProvider("google")).toThrow(/Invalid provider/);
    expect(() => validateBaseUrl("http://example.test/v1")).toThrow(/HTTPS/);
    expect(() => validateBaseUrl("https://user:pass@example.test")).toThrow(/credentials/);
  });
  it("redacts explicit and labelled secrets", () => {
    expect(redactSecrets("Authorization: Bearer sk-live-secret", ["sk-live-secret"])).toContain("[REDACTED]");
    expect(redactSecrets("api_key=super-secret")).toContain("[REDACTED]");
  });
  it("provides provider defaults", () => {
    expect(defaultsFor("anthropic")).toEqual({ provider: "anthropic", baseUrl: "https://api.anthropic.com/v1", model: "claude-sonnet-4-5" });
  });
  it("saves a complete config without an API key", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "provider-")); const file = path.join(dir, "provider.json");
    await saveStoredConfig(defaultsFor("openai-compatible"), file);
    const raw = await readFile(file, "utf8"); expect(raw).not.toContain("apiKey"); expect(await readStoredConfig(file)).toEqual(defaultsFor("openai-compatible"));
  });
  it("reports missing key instead of inventing provider readiness", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "provider-")); const file = path.join(dir, "provider.json");
    await saveStoredConfig(defaultsFor("anthropic"), file);
    await expect(loadProviderConfig({}, file)).rejects.toThrow(/No API key configured/);
  });
});
