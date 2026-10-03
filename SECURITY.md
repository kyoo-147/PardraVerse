# Security

## Local judge

`prac judge` executes the selected solution as a normal local process. The timeout limits elapsed time but does not isolate filesystem, network, memory, or child processes. Only run code you trust.

## AI credentials

Provider keys are read from environment variables and are never intentionally persisted. `.env*` is ignored except for `.env.example`.

## Public URL research

Only HTTP(S) URLs are accepted. Fetches have a timeout and content bound. Retrieved text is treated as untrusted data in the model prompt. This reduces prompt-injection risk but does not eliminate model mistakes; verify generated study briefs against their sources.

## Contest mode

Contest mode blocks this application's AI commands. It cannot disable AI features in editors, terminals, operating systems, or other applications. Follow the current official contest rules.

## Reporting

Open a private security advisory on the GitHub repository for vulnerabilities. Do not include secrets or sensitive personal data in public issues.
