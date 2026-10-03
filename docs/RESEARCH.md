# Research and architecture decision

**As of:** 2026-10-03

**Decision:** ship a small local TypeScript CLI first; keep the web UI read-only and optional; integrate providers behind a narrow adapter; do not rebuild a general coding agent.

## Product thesis

The product is a personal practice runtime, not a course marketplace and not another autonomous coding agent. Its durable unit is:

```text
Topic -> Problem -> Hand-written solution -> Local tests -> Attempt -> Reflection
```

A contest/job/public link can create a research brief and suggested learning map, but the user owns and edits the result. There is no locked curriculum.

## What was inspected

The following canonical repositories were checked locally at their current default-branch heads and used only as architectural references:

| Project | Useful idea | What we do not copy into v0.1 | License |
|---|---|---|---|
| [xai-org/grok-build](https://github.com/xai-org/grok-build) | Rust full-screen TUI, agent runtime separated from tools, headless mode, MCP/plugins/sandboxing | A full coding-agent runtime and full-screen TUI are too large for the first practice loop | Apache-2.0 |
| [openai/codex](https://github.com/openai/codex) | Local terminal agent, Rust core, explicit approval/sandbox concepts, machine-readable automation | Autonomous file editing is not the learning goal; generated solutions can undermine deliberate practice | Apache-2.0 |
| [earendil-works/pi](https://github.com/earendil-works/pi) | Minimal extensible harness, TypeScript SDK, unified providers, interactive/JSON/RPC modes | Depending on an entire agent harness would couple the practice product to agent internals | MIT |
| [herdrdev/herdr](https://github.com/herdrdev/herdr) | Durable terminal ownership, detach/reattach, agent status, one Rust binary | Multi-agent orchestration and persistent terminal layouts are later workflow integrations, not MVP requirements | Apache-2.0 |

Facts above come from the canonical READMEs and license files. The product conclusions are architectural inferences for this repository.

## Code Tour constraints that shape the product

The [official Code Tour 2026 Challenge #1 page](https://codetour.org/contest/public/83) states that the online round is individual algorithmic problem solving, permits IDEs/compilers, official language documentation, and self-prepared templates, and prohibits AI tools, search engines, forums, and repositories for solution help during the contest. The same page describes automatic judging, score-first ranking, penalty tie-breaking, full-screen recording, and Top-25 qualification per challenge.

Implications:

1. Preparation needs fast local compile/run feedback and manual coding, not AI-generated final answers.
2. AI must be easy to disable and should fail closed inside this app.
3. Templates and drills should be prepared before contest day.
4. Session timing, partial-score thinking, and post-attempt review matter alongside topic knowledge.
5. Current rules must be rechecked on the official page before each round; stored tracks may become stale.

## Stack decision

### Chosen now

- **Node.js 20+ and TypeScript**: quick iteration, good Windows support, native `fetch`, straightforward process execution, and direct compatibility with future web/API code.
- **Commander**: small command grammar with discoverable help.
- **picocolors**: restrained terminal status color.
- **JSON local state**: inspectable, portable, and sufficient at personal scale.
- **Native child processes**: compile C++20 with `g++`; execute Python/Node directly.
- **Built-in HTTP server**: one read-only status page without React, bundler, or a second app.
- **Vitest + strict TypeScript**: fast unit checks for state and judge behavior.

### Why not Rust yet

Rust is an excellent target for a distributable single binary and stronger runtime control, as the reference CLIs demonstrate. It would slow first-loop experimentation and would not itself make untrusted code safe. A Rust rewrite is justified only after command semantics and storage formats stabilize or startup/distribution measurements show a real need.

### Why not SQLite yet

JSON remains human-readable and easy to back up. SQLite becomes justified when attempts, imported problems, spaced-repetition events, or concurrent web/CLI writes become large enough to require indexed queries and transactions. Until then, atomic temporary-file replacement is enough for one local user.

### Why not a React web app yet

The user explicitly wants to escape design-heavy web work. The current web surface is a read-only dashboard. Mutations stay in the CLI, avoiding duplicated forms, API auth, state synchronization, and frontend build complexity.

## AI provider boundary

v0.1 supports:

- OpenAI-compatible `POST /chat/completions`
- Anthropic `POST /messages`

Provider credentials come only from environment variables. The application sends text and receives text; it exposes no file-editing or shell tools to the model. This is intentionally smaller than Pi/Codex/Grok Build.

Coaching policy:

1. Ask for the learner's attempt.
2. Hint level 1: directional question.
3. Hint level 2: name the pattern/invariant.
4. Hint level 3: pseudocode, not complete code.
5. Full review is for post-attempt analysis.
6. Contest mode blocks every AI-backed command.

## Link-to-learning research

`prac research <url>` provides the requested bridge from a job posting, contest page, or public learning resource to a study brief. The implementation:

1. fetches only HTTP(S), with a size and time bound;
2. strips scripts/styles and sends bounded text;
3. explicitly marks page text as untrusted data in the prompt;
4. asks for facts, unknowns, prerequisites, ordered practice, and acceptance checks;
5. stores the editable Markdown output locally.

Known limitations: client-rendered pages may yield little text; there is no broad web search yet; generated analysis still needs source verification; robots/access controls are not bypassed.

## Runtime and security boundaries

The local judge currently provides wall-clock timeouts, but it is **not a sandbox**. Code can access the user's files and network. This is acceptable only for user-authored/trusted solutions and is stated prominently.

A later secure runner should use one of:

- Linux container with no network, read-only root, tmpfs workdir, memory/PID/CPU limits;
- WSL2 sandbox on Windows with equivalent cgroup/container limits;
- a remote disposable judge service.

Do not market the current runner as safe for arbitrary downloaded submissions.

## Definition of useful v0.1

- Initialize a workspace.
- Install an editable Code Tour-oriented starter track.
- Create any topic/problem without a course gate.
- Scaffold a solution, add tests, compile/run, compare output, and record attempts.
- Time and reflect on sessions.
- Use progressive AI hints/review with configurable providers.
- Fail closed for AI commands in contest mode.
- Turn a public URL into a local study brief.
- View local progress in an intentionally simple web page.

## Sources

- https://codetour.org/
- https://codetour.org/contest/public/83
- https://github.com/xai-org/grok-build
- https://github.com/openai/codex
- https://github.com/earendil-works/pi
- https://github.com/herdrdev/herdr
- https://oj.vnoi.info/contests/?search=codetour
