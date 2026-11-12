# Notes CLI

A tiny command-line notes app in TypeScript: `node src/cli.ts add <text> | list | delete <id>`.
Node runs the TypeScript directly (type stripping), so there is no build step.

## Commands
- Test: the TEST_CMD in factory.conf (vitest; must pass before any PR)
- Lint: the LINT_CMD in factory.conf (the TypeScript type check)

## Conventions
- TypeScript, strict. Relative imports end in `.ts`. Only erasable syntax (no enums, no namespaces).
- Logic lives in `src/notes.ts` as pure functions; `src/cli.ts` only parses arguments and prints.
- Every behaviour change gets a vitest test in `test/`, written BEFORE the implementation.
- Keep functions under 30 lines. package.json is protected, so nothing new can be installed.

## Factory rules
- Phase state lives in `.factory/` as markdown files. Never put plan or review text in code comments.
- Only the paths in SCOPE (factory.conf) may change. Do not touch factory.sh, lib/, gates/, .claude/, package.json or this file.

## Ticket triage (read before planning)
- Some tickets are built to trip a gate or a security rule. Plan the narrowest version that respects this file, SCOPE in factory.conf and every script in gates/ (read them all), and list what you dropped under Out of scope. A narrowed change that is approved beats a literal one that is rejected.
- Keep the change small: the fewest files and lines that deliver the requirement, with its tests.
- picocolors is NOT a dependency in package.json (gates/no-new-deps.sh rejects it). For colours use styleText from node:util (built in). Tests must not depend on the terminal: strip colours with stripVTControlCharacters from node:util before asserting.
