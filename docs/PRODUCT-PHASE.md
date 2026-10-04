# PardraVerse product phase contract

Status: accepted product direction for the current MVP phase
Last reviewed: 2026-10-03
Evidence baseline: repository `main` through the cream-shell implementation at `07fbdf1`, plus live terminal validation
Herdr reference baseline: `herdrdev/herdr` at `5da0a01e`

## Product definition

PardraVerse is a **local-first coding practice agent**. The learner brings any topic or problem, writes code in ordinary files, runs local evidence, and asks the agent for coaching when useful.

It is not a course platform, a proprietary IDE, an autonomous general-purpose coding agent, or a substitute for an official contest judge.

The product has eight core blocks:

1. `Practice`
2. `Problems`
3. `Code`
4. `Judge`
5. `Coach`
6. `Sessions`
7. `Progress`
8. `Contest`

Research, Web UI, Providers, Memory, and Health are supporting layers. They must not displace the core practice loop.

```text
intent -> problem -> learner attempt -> local evidence -> feedback -> reflection
```

## Status vocabulary

- **IMPLEMENTED** — executable in the current product and covered by repository evidence.
- **PARTIAL** — a useful path exists, but an important part of the stated capability is absent or manual.
- **PLANNED** — accepted for this phase direction but not implemented.
- **BLOCKED** — implementation exists or is ready to use, but an external prerequisite is currently missing.

These labels describe current repository truth, not marketing intent.

## 1. Practice

| Capability | Status | Current evidence / boundary |
|---|---|---|
| Chat with a coding-practice agent in the CLI | IMPLEMENTED | `prac` opens the full-screen TUI; deterministic local chat remains available without AI. |
| Ask about algorithms and implementation ideas | PARTIAL | Supported through configured AI coaching; deterministic offline chat only covers bounded local actions. |
| Analyze an idea before coding | PARTIAL | Agent policy and prompts support this, but there is no structured idea record or acceptance flow. |
| Ask about complexity and edge cases | PARTIAL | `coach review` explicitly requests correctness, complexity, and edge-case analysis; it requires a working provider. |
| Review reasoning and code after the learner writes it | PARTIAL | `coach hint`, `coach review`, and solution-reading tools exist; review quality depends on the provider. |
| Prefer progressive hints over immediate full solutions | IMPLEMENTED | Agent policy requires direction -> pattern -> pseudocode and permits full code only after an explicit request. |
| Never claim code is correct without test evidence | IMPLEMENTED | Agent policy forbids run claims without `judge_problem`; local-judge results are labelled as evidence, not official proof. |
| Open-ended practice rather than a locked curriculum | IMPLEMENTED | Arbitrary topics/problems are first-class; Code Tour content is an optional editable starter track. |

## 2. Problems

| Capability | Status | Current evidence / boundary |
|---|---|---|
| Create any topic | IMPLEMENTED | CLI, agent tool, and offline chat creation paths persist topics in `.prac/state.json`. |
| Create any problem | IMPLEMENTED | CLI/agent/offline paths persist a problem and create its starter solution file. |
| Store statement, difficulty, language, source URL, tests | IMPLEMENTED | All are represented in `Problem`; CLI exposes statement/source/language/difficulty and local test creation. |
| Store and edit constraints | PARTIAL | Constraints are represented and displayed, but there is no complete explicit CLI editing surface. |
| Store sample tests and add local tests | IMPLEMENTED | Named input/expected-output test cases are persisted locally. |
| Import a problem directly from a link | PLANNED | Public pages can be researched and saved as notes, but they are not converted into a reviewed problem record. |
| Import/export a local problem package | PLANNED | Listed for v0.3 in `docs/ROADMAP.md`. |

## 3. Code

| Capability | Status | Current evidence / boundary |
|---|---|---|
| Use real files on disk | IMPLEMENTED | Solutions live under `solutions/` and remain ordinary learner-owned files. |
| One solution file per problem | IMPLEMENTED | Stable path is derived from problem ID and language extension. |
| C++20 | BLOCKED | Runner support exists; current machine lacks `g++`. |
| Python | IMPLEMENTED | Python runner path exists; availability is checked through the host toolchain. |
| JavaScript | IMPLEMENTED | Node-based `.cjs` solutions run locally. |
| Open with any editor | IMPLEMENTED | PardraVerse imposes no editor or proprietary project format. |
| Learner-owned reusable templates | PLANNED | Accepted v0.3 item; starter files are currently fixed by language. |

## 4. Judge

| Capability | Status | Current evidence / boundary |
|---|---|---|
| Compile or execute the current solution | IMPLEMENTED | Language-specific local runner invokes real child processes. |
| Run saved tests and compare expected/actual | IMPLEMENTED | Output is normalized and compared per test. |
| Accepted / Wrong Answer / Runtime Error / Compile Error / Timeout | IMPLEMENTED | All five verdicts are represented and recorded. |
| Show runtime per case | IMPLEMENTED | Per-test duration is returned and printed. |
| Persist attempt history | IMPLEMENTED | Attempts persist problem, timestamp, counts, duration, and verdict. |
| Cancel a running judge task | IMPLEMENTED | Abort signals propagate from the TUI/agent into process execution. |
| Safely execute untrusted code | PLANNED | Current timeout-based runner is explicitly not a sandbox; isolation is a later phase. |
| Official hidden-test correctness | PLANNED | Local evidence cannot prove official-judge acceptance. |

## 5. Coach

| Capability | Status | Current evidence / boundary |
|---|---|---|
| Directional hint, pattern hint, pseudocode | IMPLEMENTED | Explicit three-level hint contract exists. |
| Explain the first failure without replacing the learner's work | PARTIAL | Agent can combine judge evidence and review prompts; no formal failure taxonomy is persisted yet. |
| Review correctness, complexity, edge cases, and improvement | IMPLEMENTED | Explicit `coach review` prompt and solution-file read path exist. |
| Write a full solution only after explicit request | IMPLEMENTED | Policy and narrow write tool enforce the intended boundary at the application layer. |
| Remember recurring mistake categories | PLANNED | Failure taxonomy and spaced review queue are v0.3 work. |
| Work without an AI provider | PARTIAL | Practice/status/problem/judge/session flows work; open-ended algorithm coaching does not. |

## 6. Sessions

PardraVerse currently has two related session concepts:

- **Practice session** — timer, goal, optional problem, and end reflection.
- **Conversation session** — durable chat transcript that can be resumed independently.

They should remain distinct in storage and be presented together coherently in the TUI.

| Capability | Status | Current evidence / boundary |
|---|---|---|
| Start a practice session | IMPLEMENTED | A goal and optional problem ID are persisted with a start timestamp. |
| Track elapsed learning time | IMPLEMENTED | CLI and read-only web derive elapsed time from `startedAt`. |
| Finish with a note | IMPLEMENTED | A Markdown reflection row is appended to `.prac/sessions.md`. |
| Record problems completed during a session | PARTIAL | The attached problem is recorded; a multi-problem session ledger is not. |
| Record encountered errors in structured form | PLANNED | Free-form reflection exists, structured error taxonomy does not. |
| Resume a previous conversation | IMPLEMENTED | Named conversation sessions have stable IDs and an active pointer. |
| List/create/open/rename/archive/delete conversations | IMPLEMENTED | Available in TUI slash commands and explicit `prac chat` commands. |
| Resume a finished practice timer/session | PLANNED | Finished practice sessions are historical Markdown records, not resumable timers. |

## 7. Progress

| Capability | Status | Current evidence / boundary |
|---|---|---|
| Show problem, accepted, and attempt counts | IMPLEMENTED | CLI status and web view derive them from local state. |
| Show current problem/session | IMPLEMENTED | TUI context and web view project the active practice state. |
| Show attempt history | IMPLEMENTED | Recent attempts are rendered; full state remains locally inspectable. |
| Show progress by topic | PARTIAL | Problems can be filtered by topic; no dedicated aggregate topic-progress view exists. |
| Show session history | PARTIAL | Practice reflections and conversation summaries persist, but there is no unified chronological view. |
| Show recurring weaknesses | PLANNED | Requires structured failure taxonomy and review queue. |
| Show whether the next attempt improved | PLANNED | Attempt records exist; comparative learning feedback is not derived yet. |

## 8. Contest

| Capability | Status | Current evidence / boundary |
|---|---|---|
| Enable/disable/status contest mode | IMPLEMENTED | Explicit CLI commands persist the lock. |
| Prevent this application from creating AI requests | IMPLEMENTED | Agent creation, chat fallback, provider test, and provider login test fail closed. |
| Keep local status/problem/judge tools usable | IMPLEMENTED | Deterministic local paths remain available. |
| Prevent the agent from editing solutions while locked | IMPLEMENTED | No AI agent request is created; local explicit commands remain user-controlled. |
| Control other editors, terminals, or applications | PLANNED | Explicit non-goal: the application cannot enforce system-wide contest rules. |

## Supporting layers

### Research

| Capability | Status | Current evidence / boundary |
|---|---|---|
| Fetch a bounded public page | IMPLEMENTED | Private/local hosts and unsafe redirects are rejected; response size/time are bounded. |
| Read public contest pages, rules, statements, and docs | PARTIAL | Generic public-page extraction works; no site-specific adapters or freshness verification. |
| Summarize into an editable Markdown study note | IMPLEMENTED | Notes are stored under `research/`. |
| Preserve claim-to-source citations and freshness | PLANNED | Accepted v0.5 work. |

### Web UI

| Capability | Status | Current evidence / boundary |
|---|---|---|
| Optional read-only view | IMPLEMENTED | `prac serve` renders current state on each request. |
| View problems, active session, progress, attempts | IMPLEMENTED | All are shown from the local state store. |
| Mutate learning state from the web | PLANNED | Deliberate non-goal for this phase; terminal remains the single mutation path. |

### Providers

| Capability | Status | Current evidence / boundary |
|---|---|---|
| OpenAI-compatible | IMPLEMENTED | Config, status, explicit connectivity test, and Pi model adapter exist. |
| Anthropic | IMPLEMENTED | Anthropic Messages configuration and model adapter exist. |
| Change model and endpoint | IMPLEMENTED | Non-secret metadata can be saved; environment values take precedence. |
| Keep API keys out of local config | IMPLEMENTED | Keys remain environment-only and error output is redacted. |
| Use a local OpenAI-compatible model endpoint | PARTIAL | Localhost HTTP is permitted; no local model is installed or verified by the project. |
| Successful live AI response on the current machine | BLOCKED | The configured OpenAI request reaches the provider but returns `429 insufficient_quota`. |

### Memory

| Capability | Status | Current evidence / boundary |
|---|---|---|
| Remember conversation and reopen it | IMPLEMENTED | One JSON file per durable conversation plus atomic active index. |
| Remember problems, attempts, notes, and progress | IMPLEMENTED | Persisted in local JSON, Markdown, and learner-owned files. |
| Preserve corrupt chat state for recovery | IMPLEMENTED | Corrupt data is not overwritten silently. |
| Semantic long-term learner model | PLANNED | No embeddings, profile inference, or hidden memory service. |

### Health

| Capability | Status | Current evidence / boundary |
|---|---|---|
| Check Node, `g++`, workspace state, and AI config | IMPLEMENTED | `prac doctor` reports each honestly. |
| Check Python explicitly | PARTIAL | Python is a supported runner, but doctor does not yet print a dedicated Python result. |
| Check provider connectivity | IMPLEMENTED | `prac provider test` performs an explicit request and surfaces the real provider error. |

## Current phase priorities

The next implementation work should be ordered by the learner workflow, not infrastructure novelty:

The approved cream pane shell is now implemented and live-validated at wide width. It projects real Problems, Sessions, practice context, files, attempts, sources, runtime mode, and provider state; compact mode intentionally removes secondary panes.

1. Complete one coherent loop: choose/create problem -> inspect statement/tests -> edit real file -> run -> review evidence -> reflect.
2. Add structured failure categories and attempt comparison.
3. Add topic progress and a review queue from actual failures.
4. Add problem import as a reviewed transformation, never an automatic scrape-and-trust path.
5. Add an isolated runner before accepting untrusted code.

Do not introduce SQLite, a daemon, a general shell tool, a course marketplace, or a rich mutable web client until measured use proves a need.

## TUI acceptance contract

The approved wide layout is:

```text
┌ PardraVerse ─────────────────────────────────────────────────────┐
│ workspace: algorithms          session: prefix sums             │
├───────────────┬──────────────────────────────────┬───────────────┤
│ Problems      │ conversation / problem           │ Session       │
│ Sessions      │ evidence and coaching            │ Files         │
│               │                                  │ Run status    │
│               │                                  │ Notes/sources │
├───────────────┴──────────────────────────────────┴───────────────┤
│ > type a message or command                                     │
└─────────────────────────────────────────────────────────────────┘
```

Required visual qualities:

- warm cream canvas, not a default white terminal;
- complete thin pane borders, not unrelated floating columns;
- stable header, tab strip, navigator, context pane, composer, and footer;
- slate/navy body text with low-coverage purple interaction accents;
- readable central transcript width and deliberate clipping in side panes;
- real data only: no invented workspaces, agents, metrics, statuses, or notes;
- compact mode hides secondary panes intentionally instead of crushing text;
- no repeated speaker headings; compact time/glyph/rail treatment is sufficient;
- terminal colors/theme are restored when PardraVerse exits.

The supplied `pardra_ui.png` is the visual target. Concept-only rows shown there must be replaced with truthful local state rather than fabricated to make the screen look populated.

## Herdr architecture lessons

PardraVerse should adapt these principles, not copy Herdr branding or pretend to have its runtime:

- **State is separate from runtime.** Persisted practice/session data must not depend on live terminal components.
- **View computation is separate from rendering.** Derive a bounded shell model first; rendering should not read the filesystem or mutate product state.
- **Geometry is explicit.** Wide, regular, and compact layouts need named breakpoints and deterministic pane allocations.
- **Workspace/session identity is stable.** Tabs and navigator rows project durable IDs rather than screen-order identities.
- **Pane responsibilities stay narrow.** Navigator, transcript, context, composer, and footer should be independently renderable and testable.
- **Hidden panes do not create fake work.** Compact mode changes presentation only; it does not alter product state or start background processes.

Explicit non-goals for this phase:

- no Herdr daemon, PTY multiplexer, remote control plane, mouse-first workspace manager, or multi-agent fleet;
- no literal Rust source transplant into the TypeScript/Pi TUI;
- no fake agent rows or CPU/RAM/token metrics;
- no claim that local timeout execution is secure isolation.
