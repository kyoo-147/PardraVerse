import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { judgeFile, normalizeOutput } from "../src/runner.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe("runner", () => {
  it("normalizes line endings and trailing whitespace only", () => {
    expect(normalizeOutput("a\r\nb\n\n")).toBe("a\nb");
    expect(normalizeOutput("a b")).not.toBe(normalizeOutput("ab"));
  });

  it("judges a JavaScript solution", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "prac-runner-"));
    roots.push(root);
    const file = path.join(root, "sum.cjs");
    await writeFile(file, "const a=require('fs').readFileSync(0,'utf8').trim().split(/\\s+/).map(Number); console.log(a.reduce((x,y)=>x+y,0));");
    const result = await judgeFile({ language: "javascript", file, tests: [{ name: "sum", input: "2 3 4\n", expected: "9\n" }] });
    expect(result.results[0]?.verdict).toBe("passed");
  });

  it("reports wrong answers", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "prac-runner-"));
    roots.push(root);
    const file = path.join(root, "wrong.cjs");
    await writeFile(file, "console.log('nope')");
    const result = await judgeFile({ language: "javascript", file, tests: [{ name: "case", input: "", expected: "yes\n" }] });
    expect(result.results[0]?.verdict).toBe("wrong-answer");
  });
  it("cancels a running solution when the caller aborts", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "prac-runner-"));
    roots.push(root);
    const file = path.join(root, "loop.cjs");
    await writeFile(file, "for (;;) {}", "utf8");
    const controller = new AbortController();
    setTimeout(() => controller.abort(new Error("cancelled")), 30);

    await expect(judgeFile({
      language: "javascript",
      file,
      tests: [{ name: "loop", input: "", expected: "" }],
      timeoutMs: 5_000,
      signal: controller.signal,
    })).rejects.toThrow("cancelled");
  });
});
