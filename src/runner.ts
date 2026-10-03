import { mkdtemp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import type { Language, RunResult, TestCase } from "./types.js";

interface ProcessResult {
  code: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export function normalizeOutput(value: string): string {
  return value.replace(/\r\n/g, "\n").trimEnd();
}

export async function runProcess(
  command: string,
  args: string[],
  options: { input?: string; cwd?: string; timeoutMs?: number } = {},
): Promise<ProcessResult> {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, options.timeoutMs ?? 2_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (stdout += chunk));
    child.stderr.on("data", (chunk: string) => (stderr += chunk));
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr, timedOut, durationMs: performance.now() - started });
    });
    child.stdin.end(options.input ?? "");
  });
}

export async function judgeFile(options: {
  language: Language;
  file: string;
  tests: TestCase[];
  timeoutMs?: number;
}): Promise<{ compileError?: string; results: RunResult[] }> {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "prac-"));
  try {
    let command: string;
    let args: string[];

    if (options.language === "cpp") {
      const binary = path.join(workspace, process.platform === "win32" ? "solution.exe" : "solution");
      let compile: ProcessResult;
      try {
        compile = await runProcess(
          "g++",
          [options.file, "-std=c++20", "-O2", "-pipe", "-o", binary],
          { timeoutMs: 20_000 },
        );
      } catch (error) {
        return { compileError: `Could not start g++: ${(error as Error).message}`, results: [] };
      }
      if (compile.code !== 0) return { compileError: compile.stderr || compile.stdout, results: [] };
      command = binary;
      args = [];
    } else if (options.language === "python") {
      command = process.platform === "win32" ? "python" : "python3";
      args = [options.file];
    } else {
      command = process.execPath;
      args = [options.file];
    }

    const results: RunResult[] = [];
    for (const test of options.tests) {
      let execution: ProcessResult;
      try {
        execution = await runProcess(command, args, {
          input: test.input,
          timeoutMs: options.timeoutMs ?? 2_000,
        });
      } catch (error) {
        results.push({
          name: test.name,
          verdict: "runtime-error",
          durationMs: 0,
          expected: test.expected,
          actual: "",
          stderr: (error as Error).message,
        });
        continue;
      }
      const verdict = execution.timedOut
        ? "timeout"
        : execution.code !== 0
          ? "runtime-error"
          : normalizeOutput(execution.stdout) === normalizeOutput(test.expected)
            ? "passed"
            : "wrong-answer";
      results.push({
        name: test.name,
        verdict,
        durationMs: execution.durationMs,
        expected: test.expected,
        actual: execution.stdout,
        stderr: execution.stderr,
      });
    }
    return { results };
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}
