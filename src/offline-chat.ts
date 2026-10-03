import { PracticeWorkspace } from "./practice.js";

export async function answerOffline(workspace: PracticeWorkspace, input: string): Promise<string> {
  const text = input.trim();
  const lower = text.toLowerCase();

  if (/\b(status|progress|overview)\b/.test(lower) || /how am i doing/.test(lower)) {
    const status = await workspace.status();
    const session = status.activeSession
      ? ` Active session: ${status.activeSession.goal}${status.activeSession.problemId ? ` (${status.activeSession.problemId})` : ""}.`
      : " No active session.";
    return `Mode: ${status.mode}. ${status.accepted}/${status.problems} problems accepted across ${status.attempts} attempts.${session}`;
  }

  const createTopicMatch = text.match(/^(?:please\s+)?create\s+(?:a\s+)?topic\s+(.+?)[.!?]*$/i);
  if (createTopicMatch?.[1]) {
    const topic = await workspace.createTopic(createTopicMatch[1].trim());
    return `Created topic ${topic.id} — ${topic.name}.`;
  }

  const createProblemMatch = text.match(/^(?:please\s+)?create\s+(?:a\s+)?problem\s+(.+?)\s+(?:in|under)\s+(?:the\s+)?topic\s+([a-z0-9][a-z0-9-]*)[.!?]*$/i);
  if (createProblemMatch?.[1] && createProblemMatch[2]) {
    const problem = await workspace.createProblem({ title: createProblemMatch[1].trim(), topic: createProblemMatch[2], language: "javascript" });
    return `Created ${problem.id}. Write your solution in ${problem.solutionFile}.`;
  }

  const startMatch = text.match(/^(?:please\s+)?start\s+(?:a\s+)?(?:practice\s+)?session(?:\s+for\s+([a-z0-9][a-z0-9-]*))?(?:\s+(?:with\s+)?goal\s+(.+))?[.!?]*$/i);
  if (startMatch) {
    const problemId = startMatch[1];
    const goal = startMatch[2]?.trim() || (problemId ? `Practice ${problemId}` : "deliberate practice");
    await workspace.startSession(problemId, goal);
    return `Started a focused session${problemId ? ` for ${problemId}` : ""}: ${goal}.`;
  }

  const finishMatch = text.match(/^(?:please\s+)?finish\s+(?:the\s+)?session(?:\s+(?:with\s+)?note\s+(.+))?[.!?]*$/i);
  if (finishMatch) {
    const result = await workspace.finishSession(finishMatch[1]?.trim());
    return `Finished the session after ${result.minutes} minute${result.minutes === 1 ? "" : "s"}.`;
  }
  const judgeMatch = text.match(/^(?:please\s+)?(?:judge|run|test)(?:\s+(?:my\s+)?(?:current\s+)?(?:solution|code))?(?:\s+(?:for\s+)?([a-z0-9][a-z0-9-]*))?[\s.!?]*$/i);
  if (judgeMatch) {
    const state = await workspace.store.load();
    const problemId = judgeMatch[1] ?? state.activeSession?.problemId;
    if (!problemId) return "Which problem should I run? Include its id, or start a session for it first.";
    const result = await workspace.judge(problemId);
    if (result.compileError) return `Compile error for ${problemId}:\n${result.compileError}`;
    const details = result.results
      .filter((item) => item.verdict !== "passed")
      .map((item) => `${item.name}: ${item.verdict}${item.stderr ? ` — ${item.stderr.trim()}` : ""}`)
      .join("\n");
    return `${result.verdict.toUpperCase()} — ${result.passed}/${result.total} local tests passed.${details ? `\n${details}` : ""}`;
  }

  if (/\b(list|what)\b.*\bproblems?\b/.test(lower) || /\bshow\s+(?:me\s+)?(?:my\s+)?problems\b/.test(lower) || lower === "problems") {
    const problems = await workspace.listProblems();
    if (!problems.length) return "There are no problems yet. Try: Create topic Arrays. Then: Create problem Sum values in topic arrays.";
    return problems
      .map((problem) => `${problem.accepted ? "✓" : "·"} ${problem.id} — ${problem.title} (${problem.difficulty}, ${problem.attempts} attempts)`)
      .join("\n");
  }
  const showMatch = text.match(/(?:show|open|describe)\s+(?:problem\s+)?([a-z0-9][a-z0-9-]*)/i);
  if (showMatch?.[1]) {
    const problem = await workspace.getProblem(showMatch[1]);
    const solution = await workspace.ensureSolution(problem);
    return `${problem.title}\n${problem.statement || "No statement yet."}\nTopic: ${problem.topic} · ${problem.difficulty} · ${problem.language} · ${problem.tests.length} local tests\nSolution: ${solution}`;
  }
  if (/contest mode/.test(lower)) {
    const status = await workspace.status();
    return `Contest mode is ${status.mode === "contest" ? "on" : "off"}. Change it explicitly with \`prac contest on\` or \`prac contest off\`; local chat will not guess about a safety lock.`;
  }

  return "I’m in local-only mode, so I can show status, list or open problems, and run local tests. Configure PRAC_AI_API_KEY to add coaching, planning, research, and workspace changes through conversation.";
}
