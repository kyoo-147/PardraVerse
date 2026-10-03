import { describe, expect, it } from "vitest";
import { fetchPublicPage, loadAiConfig } from "../src/ai.js";

describe("AI configuration", () => {
  it("requires a key", () => expect(() => loadAiConfig({})).toThrow("PRAC_AI_API_KEY"));
  it("supports an OpenAI-compatible endpoint", () => expect(loadAiConfig({ PRAC_AI_API_KEY: "test", PRAC_AI_BASE_URL: "https://llm.example/v1" })).toMatchObject({ provider: "openai-compatible", baseUrl: "https://llm.example/v1" }));
});

describe("public page guard", () => {
  it.each(["http://localhost/private", "http://127.0.0.1/private", "http://169.254.169.254/latest/meta-data", "file:///etc/passwd"])("blocks local URL %s", async (url) => {
    await expect(fetchPublicPage(url)).rejects.toThrow(/public|Private|local/);
  });
});
