# Roadmap

Keep every phase useful on its own. Add infrastructure only when a measured workflow needs it.

## v0.1 — local practice core

- [x] Open-ended topics and editable problems
- [x] C++20, Python, and JavaScript execution
- [x] Local test verdicts and attempt history
- [x] Focused session timer and reflection log
- [x] OpenAI-compatible and Anthropic coaching
- [x] Fail-closed contest lock
- [x] Public-link study notes
- [x] Read-only local web view

## v0.2 — conversational workspace

- [x] Full-screen chat as the default interface
- [x] Narrow typed practice tools instead of a general shell
- [x] Progressive coaching policy and explicit solution-writing boundary
- [x] Restorable chat transcript and archived sessions
- [x] Append-only runtime/tool lifecycle events
- [x] Local-only conversation when AI is unavailable or locked
- [x] Compact web workspace redesign
- [x] Explicit commands retained for scripts and recovery

Acceptance: a new user can initialize the workspace, open `prac`, describe a learning goal, create or choose a problem, run local evidence, and continue the conversation after restarting without memorizing the command tree.

## v0.3 — stronger learning feedback

Build after collecting real attempt history.

- Failure taxonomy: idea, proof, complexity, implementation, edge case, and time
- Review queue based on failed attempts and elapsed time
- Property-based and randomized tests with saved seeds
- Whitespace-sensitive and numeric-tolerance comparison modes
- Import/export for local problem packages
- Learner-owned reusable template files

Acceptance: the learner can explain what failed, what to revisit, and whether the next attempt improved without reconstructing history manually.

## v0.4 — isolated runner

- Container or WSL backend
- Network disabled by default
- CPU, memory, process, output, and filesystem limits
- Per-language compiler profiles
- Clear `trusted-local` versus `isolated` runtime labels

Acceptance: an adversarial validation corpus cannot read host files, access the network, fork-bomb, or exceed configured resources.

## v0.5 — evidence-backed research

- Multi-source research with claim-to-URL citations
- Adapters for documented public APIs
- Freshness dates and stale-source warnings
- Proposed skill maps that require learner approval
- Convert approved gaps into editable topics and drills

Acceptance: each factual requirement is traceable to a source or marked unknown, and every generated plan remains editable.

## Build only when justified

- SQLite, when JSON queries or concurrent writers become a real limit
- A local daemon, when detached long-running work has a demonstrated use case
- A richer web client, when read-only views are insufficient for an observed workflow
- Plugin/MCP support, when a concrete integration cannot fit the narrow tool boundary

## Non-goals

- Rebuilding Pi, Codex, Grok Build, or Herdr
- Autonomous answer generation as the default learning path
- A fixed course catalog or required learning sequence
- Accounts, billing, social rankings, badges, or a marketplace
- Protected-judge scraping or unsupported automated submission
