# Roadmap

Keep each phase useful by itself. Do not add infrastructure before its acceptance check is needed.

## v0.1 — local practice loop (implemented)

- [x] Topics and editable problems
- [x] C++20, Python, and JavaScript local execution
- [x] Local test verdicts and attempt history
- [x] Focused session timer and reflection log
- [x] Editable Code Tour starter track
- [x] OpenAI-compatible and Anthropic coaching
- [x] Contest-mode AI lock
- [x] Public-link study brief
- [x] Minimal read-only web dashboard

## v0.2 — stronger learning feedback

Build only after using v0.1 on at least 20 real attempts.

- Failure taxonomy: idea/proof/complexity/implementation/edge-case/time
- Review queue based on failed attempts and elapsed time
- Property-based and randomized test generation with saved seeds
- Diff modes for whitespace-sensitive and numeric-tolerance problems
- Import a local problem package without scraping protected judges
- Export a self-prepared C++ template file
- Mock-contest sessions with freeze, penalty, and partial-score notes

Acceptance: a learner can explain what failed, what to revisit, and whether the next attempt improved without manually reconstructing history.

## v0.3 — safe runner

- Container/WSL backend
- No network by default
- CPU, memory, process, output, and filesystem limits
- Per-language compiler profiles
- Clear distinction between trusted local mode and sandboxed mode

Acceptance: an adversarial test corpus cannot read host files, access the network, fork-bomb, or exceed configured resources.

## v0.4 — research and planning

- Multi-source research with claim-to-URL citations
- Adapter for official contest/job APIs where available
- Extracted skill graph remains proposed until user approves it
- Convert approved gaps into topics/drills
- Freshness dates and stale-source warnings

Acceptance: every factual requirement is traceable to a source or marked unknown; generated drills are editable.

## v0.5 — optional interactive TUI/Web UI

Only add after command usage shows which views deserve permanence.

- Keyboard-first TUI for problem queue, timer, and verdicts
- Live local dashboard updates
- No visual course lock; arbitrary topics stay first-class
- Import/export rather than cloud account dependency

## Explicit non-goals for now

- Rebuilding Codex, Pi, Grok Build, or Herdr
- Autonomous solution generation as the default learning path
- Scraping or submitting to judges without documented permission/API
- Claiming the timeout-only runner is a sandbox
- Account system, billing, social feed, badges, or course marketplace
- Heavy frontend design system
