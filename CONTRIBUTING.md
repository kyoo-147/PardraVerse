# Contributing to coding_prac

Thanks for helping improve the local practice lab.

## Before opening a change

1. Search existing issues and pull requests.
2. Keep the product CLI-first and local-first.
3. Avoid features that lock learners into a fixed course.
4. Do not add autonomous answer generation as the default learning path.
5. Keep claims about judging, sandboxing, and contest rules precise.

For larger changes, open an issue describing the learner problem and the smallest useful implementation before writing code.

## Development setup

Requirements:

- Node.js 20.11 or newer
- npm
- Optional `g++` for C++20 runner testing
- Optional Python 3 for Python runner testing

```bash
git clone https://github.com/kyoo-147/coding_prac.git
cd coding_prac
npm install
npm run check
```

Run the CLI during development:

```bash
npm run dev -- init --codetour
npm run dev -- problem list
npm run dev -- serve
```

## Pull requests

- Keep one focused concern per pull request.
- Add or update tests for behavior changes.
- Run `npm run check` and `npm audit --audit-level=low`.
- Update the README for user-facing commands or configuration.
- Never commit `.prac/`, provider keys, generated credentials, or personal practice history.
- Include screenshots only when they come from the running product; do not submit conceptual mockups as product evidence.

## Design principles

- **Practice over automation:** help the learner think and code by hand.
- **Evidence over claims:** local tests are evidence, not proof against hidden tests.
- **Open learning:** arbitrary topics and problems remain first-class.
- **Fail closed:** AI commands stay unavailable when contest mode is enabled.
- **Small runtime:** add infrastructure only after a real workflow requires it.
- **Accessible UI:** semantic structure, keyboard access, strong contrast, responsive layouts.

## Security

The current timeout-only runner is not a sandbox. Never describe it as safe for untrusted code. Please report vulnerabilities through a private GitHub security advisory rather than a public issue.

## Commit style

Use concise Conventional Commits subjects when practical:

```text
feat(cli): add mock contest sessions
fix(runner): preserve trailing blank output
```

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
