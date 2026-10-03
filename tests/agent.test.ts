import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createPracticeTools } from "../src/agent.js";
import { ChatStore } from "../src/chat-store.js";
import { answerOffline } from "../src/offline-chat.js";
import { PracticeWorkspace } from "../src/practice.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

async function root(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "prac-agent-"));
  roots.push(directory);
  return directory;
}

async function executeTool(
  tools: ReturnType<typeof createPracticeTools>,
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const found = tools.find((tool) => tool.name === name);
  if (!found) throw new Error(`Missing tool: ${name}`);
  const result = await found.execute("test-call", input, new AbortController().signal);
  const text = result.content.find((item) => item.type === "text");
  if (!text || text.type !== "text") throw new Error("Tool returned no text");
  return JSON.parse(text.text);
}

describe("practice agent tools", () => {
  it("creates, edits, and judges a problem through the same tool surface used by chat", async () => {
    const workspace = new PracticeWorkspace(await root());
    await workspace.ensure();
    const tools = createPracticeTools(workspace);

    const topic = await executeTool(tools, "create_topic", { name: "Arrays" }) as { id: string };
    const problem = await executeTool(tools, "create_problem", {
      title: "Sum values",
      topic: topic.id,
      language: "javascript",
      statement: "Print the sum of all integers.",
    }) as { id: string };
    await executeTool(tools, "add_test", {
      problemId: problem.id,
      name: "sample",
      input: "2 3 4\n",
      expected: "9\n",
    });
    await executeTool(tools, "write_solution", {
      problemId: problem.id,
      code: "const n=require('fs').readFileSync(0,'utf8').trim().split(/\\s+/).map(Number); console.log(n.reduce((a,b)=>a+b,0));",
    });
    const judged = await executeTool(tools, "judge_problem", { problemId: problem.id }) as { verdict: string; passed: number };

    expect(judged).toMatchObject({ verdict: "accepted", passed: 1 });
    expect(await workspace.status()).toMatchObject({ accepted: 1, attempts: 1 });
  });
});

describe("local-only conversation", () => {
  it("answers natural status and problem-list requests without AI", async () => {
    const workspace = new PracticeWorkspace(await root());
    await workspace.ensure();
    const topic = await workspace.createTopic("Graphs");
    await workspace.createProblem({ title: "Reachability", topic: topic.id, language: "javascript" });

    expect(await answerOffline(workspace, "How am I doing?")).toContain("0/1 problems accepted");
    expect(await answerOffline(workspace, "show me my problems")).toContain("reachability");
    expect(await answerOffline(workspace, "show problem reachability")).toContain("Topic: graphs");
    await expect(answerOffline(workspace, "run reachability")).rejects.toThrow("no local tests");
    const emptyWorkspace = new PracticeWorkspace(await root());
    await emptyWorkspace.ensure();
    expect(await answerOffline(emptyWorkspace, "Create topic Arrays")).toContain("Created topic arrays");
    expect(await answerOffline(emptyWorkspace, "Create problem Sum values in topic arrays")).toContain("sum-values.cjs");
    expect(await emptyWorkspace.listProblems()).toHaveLength(1);
  });
});

describe("chat persistence", () => {
  it("persists transcripts and archives them on reset", async () => {
    const directory = await root();
    const store = new ChatStore(directory);
    await store.replaceMessages([{ role: "user", content: "hello", timestamp: 1 }]);
    expect((await new ChatStore(directory).load()).messages).toHaveLength(1);
    await store.reset();
    expect((await store.load()).messages).toHaveLength(0);
  });
  it("preserves and reports a corrupt transcript instead of replacing it", async () => {
    const directory = await root();
    const store = new ChatStore(directory);
    await store.load();
    await writeFile(store.currentFile, "{not json", "utf8");

    await expect(new ChatStore(directory).load()).rejects.toThrow("was preserved");
    expect(await readFile(store.currentFile, "utf8")).toBe("{not json");
  });
});
