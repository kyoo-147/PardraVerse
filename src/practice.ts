import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { judgeFile } from "./runner.js";
import { slugify, Store, uniqueId } from "./store.js";
import type { Attempt, Language, Problem, PracState, TestCase } from "./types.js";

const languageExtensions: Record<Language, string> = {
  cpp: "cpp",
  python: "py",
  javascript: "cjs",
};

export class PracticeWorkspace {
  readonly store: Store;

  constructor(readonly root = process.cwd()) {
    this.store = new Store(root);
  }

  async ensure(): Promise<PracState> {
    return this.store.init();
  }

  async status(): Promise<{
    mode: "practice" | "contest";
    topics: number;
    problems: number;
    accepted: number;
    attempts: number;
    activeSession?: PracState["activeSession"];
  }> {
    const state = await this.store.load();
    const accepted = new Set(
      state.attempts.filter((attempt) => attempt.verdict === "accepted").map((attempt) => attempt.problemId),
    );
    return {
      mode: state.contestMode ? "contest" : "practice",
      topics: state.topics.length,
      problems: state.problems.length,
      accepted: accepted.size,
      attempts: state.attempts.length,
      activeSession: state.activeSession,
    };
  }

  async listProblems(topic?: string): Promise<Array<Problem & { accepted: boolean; attempts: number }>> {
    const state = await this.store.load();
    const accepted = new Set(
      state.attempts.filter((attempt) => attempt.verdict === "accepted").map((attempt) => attempt.problemId),
    );
    return state.problems
      .filter((problem) => !topic || problem.topic === topic)
      .map((problem) => ({
        ...problem,
        accepted: accepted.has(problem.id),
        attempts: state.attempts.filter((attempt) => attempt.problemId === problem.id).length,
      }));
  }

  async getProblem(id: string): Promise<Problem> {
    return findProblem((await this.store.load()).problems, id);
  }

  async createTopic(name: string, description = ""): Promise<{ id: string; name: string }> {
    const state = await this.store.load();
    const id = uniqueId(slugify(name), state.topics.map((topic) => topic.id));
    state.topics.push({ id, name, description, createdAt: new Date().toISOString() });
    await this.store.save(state);
    return { id, name };
  }

  async createProblem(input: {
    title: string;
    topic: string;
    difficulty?: Problem["difficulty"];
    language?: Language;
    statement?: string;
    sourceUrl?: string;
  }): Promise<Problem & { solutionFile: string }> {
    const state = await this.store.load();
    if (!state.topics.some((topic) => topic.id === input.topic)) {
      throw new Error(`Unknown topic: ${input.topic}`);
    }
    const id = uniqueId(slugify(input.title), state.problems.map((problem) => problem.id));
    const problem: Problem = {
      id,
      title: input.title,
      topic: input.topic,
      difficulty: input.difficulty ?? "medium",
      language: input.language ?? "cpp",
      statement: input.statement ?? "",
      constraints: [],
      sourceUrl: input.sourceUrl,
      tests: [],
      createdAt: new Date().toISOString(),
    };
    state.problems.push(problem);
    await this.store.save(state);
    const solutionFile = await this.ensureSolution(problem);
    return { ...problem, solutionFile };
  }

  async addTest(problemId: string, test: TestCase): Promise<{ problemId: string; tests: number }> {
    const state = await this.store.load();
    const problem = findProblem(state.problems, problemId);
    problem.tests.push(test);
    await this.store.save(state);
    return { problemId, tests: problem.tests.length };
  }

  solutionPath(problem: Problem): string {
    return path.join(this.root, "solutions", `${problem.id}.${languageExtensions[problem.language]}`);
  }

  async ensureSolution(problem: Problem): Promise<string> {
    const file = this.solutionPath(problem);
    await mkdir(path.dirname(file), { recursive: true });
    try {
      await access(file);
    } catch {
      await writeFile(file, starterFor(problem.language), "utf8");
    }
    return path.relative(this.root, file);
  }

  async readSolution(problemId: string): Promise<{ file: string; language: Language; code: string }> {
    const problem = await this.getProblem(problemId);
    const file = this.solutionPath(problem);
    await this.ensureSolution(problem);
    return { file: path.relative(this.root, file), language: problem.language, code: await readFile(file, "utf8") };
  }

  async writeSolution(problemId: string, code: string): Promise<{ file: string; bytes: number }> {
    const problem = await this.getProblem(problemId);
    const file = this.solutionPath(problem);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, code.endsWith("\n") ? code : `${code}\n`, "utf8");
    return { file: path.relative(this.root, file), bytes: Buffer.byteLength(code) };
  }

  async judge(problemId: string, timeoutMs = 2_000, signal?: AbortSignal): Promise<{
    problemId: string;
    verdict: Attempt["verdict"];
    passed: number;
    total: number;
    compileError?: string;
    results: Awaited<ReturnType<typeof judgeFile>>["results"];
  }> {
    const state = await this.store.load();
    const problem = findProblem(state.problems, problemId);
    if (!problem.tests.length) throw new Error("This problem has no local tests yet.");
    const file = this.solutionPath(problem);
    await this.ensureSolution(problem);
    const outcome = await judgeFile({
      language: problem.language,
      file,
      tests: problem.tests,
      timeoutMs,
      signal,
    });
    if (outcome.compileError) {
      await this.recordAttempt(state, problemId, "compile-error", 0, problem.tests.length, 0);
      return {
        problemId,
        verdict: "compile-error",
        passed: 0,
        total: problem.tests.length,
        compileError: outcome.compileError,
        results: [],
      };
    }
    const passed = outcome.results.filter((result) => result.verdict === "passed").length;
    const verdict: Attempt["verdict"] =
      passed === problem.tests.length
        ? "accepted"
        : outcome.results.some((result) => result.verdict === "timeout")
          ? "timeout"
          : outcome.results.some((result) => result.verdict === "runtime-error")
            ? "runtime-error"
            : "wrong-answer";
    await this.recordAttempt(
      state,
      problemId,
      verdict,
      passed,
      problem.tests.length,
      outcome.results.reduce((sum, result) => sum + result.durationMs, 0),
    );
    return { problemId, verdict, passed, total: problem.tests.length, results: outcome.results };
  }

  async startSession(problemId: string | undefined, goal: string): Promise<PracState["activeSession"]> {
    const state = await this.store.load();
    if (state.activeSession) throw new Error("A practice session is already active.");
    if (problemId) findProblem(state.problems, problemId);
    state.activeSession = { problemId, goal, startedAt: new Date().toISOString() };
    await this.store.save(state);
    return state.activeSession;
  }

  async finishSession(note = ""): Promise<{ minutes: number; problemId?: string; goal: string }> {
    const state = await this.store.load();
    if (!state.activeSession) throw new Error("No practice session is active.");
    const active = state.activeSession;
    const minutes = Math.max(0, Math.round((Date.now() - new Date(active.startedAt).getTime()) / 60_000));
    const log = path.join(this.store.directory, "sessions.md");
    await mkdir(this.store.directory, { recursive: true });
    const previous = await readFile(log, "utf8").catch(() => "# Practice sessions\n\n");
    const line = `- ${new Date().toISOString()} | ${minutes} min | ${active.problemId ?? "open"} | ${active.goal}${note ? ` | ${note}` : ""}\n`;
    await writeFile(log, previous + line, "utf8");
    delete state.activeSession;
    await this.store.save(state);
    return { minutes, problemId: active.problemId, goal: active.goal };
  }

  async setContestMode(enabled: boolean): Promise<{ contestMode: boolean }> {
    const state = await this.store.load();
    state.contestMode = enabled;
    await this.store.save(state);
    return { contestMode: enabled };
  }

  private async recordAttempt(
    state: PracState,
    problemId: string,
    verdict: Attempt["verdict"],
    passed: number,
    total: number,
    durationMs: number,
  ): Promise<void> {
    state.attempts.push({
      id: randomUUID(),
      problemId,
      at: new Date().toISOString(),
      passed,
      total,
      durationMs,
      verdict,
    });
    await this.store.save(state);
  }
}

export function findProblem(problems: Problem[], id: string): Problem {
  const problem = problems.find((candidate) => candidate.id === id);
  if (!problem) throw new Error(`Unknown problem: ${id}`);
  return problem;
}

function starterFor(language: Language): string {
  if (language === "cpp") {
    return "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    return 0;\n}\n";
  }
  if (language === "python") {
    return "import sys\n\ndef main() -> None:\n    pass\n\nif __name__ == \"__main__\":\n    main()\n";
  }
  return "function main(input) {\n  return \"\";\n}\n\nprocess.stdout.write(main(require(\"fs\").readFileSync(0, \"utf8\")));\n";
}
