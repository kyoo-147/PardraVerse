# Architecture decision

**Decision:** keep the small TypeScript practice core, make conversation the primary interface, and reuse focused Pi libraries for the agent loop, model adapters, and terminal rendering. Keep explicit commands for automation and recovery.

## Product boundary

PardraVerse is a coding-learning agent, not a general autonomous developer and not a course marketplace. Its durable learning loop is:

```text
intent -> problem -> learner attempt -> local evidence -> feedback -> reflection
```

Topics, problems, solutions, sources, and study notes remain ordinary local data. The conversational layer coordinates that data; it does not replace it with a proprietary course model.

## References inspected

| Project | Adapted idea | Deliberate boundary | License |
|---|---|---|---|
| [Pi](https://github.com/earendil-works/pi) | Typed agent loop, streaming events, provider adapters, differential terminal UI | Reuse the published libraries, not Pi's full coding-agent product or branding | MIT |
| [OpenAI Codex](https://github.com/openai/codex) | Separate protocol, core, tools, state, and TUI concerns; make approvals and sandbox claims explicit | No broad autonomous shell or filesystem toolset | Apache-2.0 |
| [Grok Build](https://github.com/xai-org/grok-build) | Keep lifecycle, chat state, PTY/runtime concerns, and workspace operations separate | No worktree orchestration or background worker fleet | Apache-2.0 |
| [Herdr](https://github.com/herdrdev/herdr) | Durable session identity, append-only lifecycle events, explicit attach/restore thinking | No daemon, remote terminal ownership, or multi-agent manager | Apache-2.0 |

These repositories are architectural references. PardraVerse does not copy their names, visual identity, or product surfaces.

## Chosen structure

```text
┌──────────────────────────────────────────────────────────────┐
│ TUI / explicit CLI / read-only web view                     │
├──────────────────────────────────────────────────────────────┤
│ conversational agent                                        │
│ teaching policy · narrow typed tools · provider stream       │
├──────────────────────────────────────────────────────────────┤
│ practice workspace                                          │
│ topics · problems · solutions · tests · judge · sessions     │
├──────────────────────────────────────────────────────────────┤
│ durable local state                                         │
│ state.json · chat JSON · event JSONL · ordinary files        │
└──────────────────────────────────────────────────────────────┘
```

### Why Pi libraries

The project already used TypeScript and Node. `@earendil-works/pi-agent-core`, `@earendil-works/pi-ai`, and `@earendil-works/pi-tui` provide the three difficult generic pieces without forcing the full Pi application into this repository:

- tool-calling turns, streaming events, interruption, and follow-up behavior;
- OpenAI-compatible and Anthropic transport behavior;
- width-aware terminal components, editor input, scrolling, and differential rendering.

This is smaller and less risky than implementing another provider protocol and terminal renderer. It requires Node 22.19+, matching the upstream packages.

### Narrow tool policy

The model receives practice-specific tools only:

- inspect progress and problems;
- create topics, problems, and tests;
- read or update one known solution file;
- run the local judge and record its evidence;
- start or finish focused sessions;
- fetch a bounded public page and save a study note;
- enable the contest lock.

It does not receive an unrestricted shell or arbitrary file read/write tools. Complete solution writing is a teaching-policy exception that requires an explicit learner request.

### Durable runtime without a daemon

Named conversations have stable IDs, an atomic active-session index at `.prac/chat/sessions.json`, and one bounded JSON file per session under `.prac/chat/sessions/`. They can be listed, created, opened, renamed, archived, and deleted from the TUI or explicit CLI. Legacy `current.json` and archive data migrate forward without destructive rewriting; corrupt state is preserved for recovery. `.prac/events.jsonl` records session and tool lifecycle events without storing provider credentials.

This adapts Herdr's durable identity and restore ideas to a smaller foreground application. It does not add Herdr's daemon, PTY ownership, remote control, or worker orchestration. The left navigator, central transcript, and right practice context are projections of local state, not a hidden process manager.

A daemon, detach/reattach protocol, remote control plane, or concurrent worker system is not justified by the current single-learner workflow.

## Provider and offline behavior

Non-secret provider, base URL, and model metadata can be saved with `prac provider setup`. API keys remain environment-only and `prac provider login` is a key-availability check rather than OAuth. `prac provider test` is the only default command that performs a connectivity request. When no key is configured, or when contest mode is active, the same TUI starts in deterministic local-only mode. It can show status, browse problems, manage conversations, and run saved tests without making an AI request.

## Web boundary

The browser surface is intentionally read-only. It presents the same practice state in a compact workspace view. Creation, code changes, judging, and coaching stay in the terminal so there is one mutation path and one source of truth.

## Security boundaries

- The local judge is a normal child process with a wall-clock timeout. It is **not** a sandbox.
- Public-page fetching rejects local/private destinations, revalidates redirects, and bounds time and content size.
- Retrieved page text is treated as untrusted data in the agent policy.
- Contest mode prevents this app from creating AI requests; it cannot control other software.
- Model output is not execution evidence. Only tool results and recorded state support claims that code ran.

## Explicit non-goals

- general autonomous repository editing;
- hidden background agents or multi-agent orchestration;
- cloud accounts, billing, social feeds, or a course marketplace;
- protected-judge scraping or automated submissions without a documented API;
- claiming timeout-only execution is secure isolation;
- a database, daemon, or frontend framework before measured usage requires one.

## Sources

- https://github.com/earendil-works/pi
- https://github.com/openai/codex
- https://github.com/xai-org/grok-build
- https://github.com/herdrdev/herdr
