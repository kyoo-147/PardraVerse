# Security

## Local judge

`prac judge` executes the selected solution as a normal local process. The timeout limits elapsed time but does not isolate filesystem, network, memory, or child processes. Only run code you trust.

## AI credentials

Provider keys are read from environment variables and are never intentionally persisted. `.env*` is ignored except for `.env.example`. Chat transcripts and tool lifecycle events are stored locally under `.prac/`; do not paste secrets into the conversation.

## Public URL research

Only HTTP(S) URLs are accepted; embedded credentials and hostnames resolving to local/private addresses are rejected on each redirect. Fetches have a timeout and content bound. Retrieved text is treated as untrusted data in the model prompt. This reduces SSRF and prompt-injection risk but does not make web research a security boundary; verify generated study briefs against their sources.

## Contest mode

Contest mode prevents this application from creating AI requests and leaves only deterministic local actions available. It cannot disable AI features in editors, terminals, operating systems, or other applications. Follow the applicable rules.

## Reporting

Open a private security advisory on the GitHub repository for vulnerabilities. Do not include secrets or sensitive personal data in public issues.
