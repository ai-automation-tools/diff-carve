# CLAUDE.md

Standing orders for the agent that works this repo, usually the weekly roadmap routine.

## What DiffCarve is

A CLI and GitHub Action that splits an oversized pull request, typically one an AI coding
agent wrote, into a dependency-ordered stack of smaller PRs. It builds an import graph over
the changed files and cuts along it, so no layer imports from a layer that comes after it.
Each layer gets a reviewability score (lines changed, files touched, cyclomatic complexity
delta, reverse-dependency count) with the inputs shown, not just a pass/fail.

The bet under the whole project: static import-graph analysis produces layers a human
reviewer calls sensible on real, messy diffs. Roadmap Slice 0 tests that first. If the spike
fails, stop building features and say so.

Full spec: `docs/product/spec.md`. Slice order: `docs/product/build-plan.md`. Work queue:
`docs/ROADMAP.md`.

## Stack

- TypeScript 6.0, ESM (`"type": "module"`), Node 22.18 or newer. **npm**, not pnpm or yarn.
  TypeScript is pinned to `~6.0` because `typescript-eslint` doesn't support 7.x yet.
- Sources import each other with `.ts` extensions (`import { run } from "./run.ts"`). Node
  strips types at runtime and `tsc` rewrites the extensions on build
  (`rewriteRelativeImportExtensions`). `erasableSyntaxOnly` is on: no enums, no namespaces,
  no parameter properties.
- Analyzer: **ts-morph** for TS/JS (ADR-001). Python, when it comes, uses the `ast` module
  through a small Python helper.
- Tests: `node:test` and `node:assert/strict`, files in `test/*.test.ts`. No Jest, no Vitest.
- Lint: ESLint 9 flat config with `typescript-eslint` recommended, plus `tsc --noEmit`.
- `src/cli.ts` is the bin entry; logic goes in modules that take their inputs as arguments
  so tests can call them without spawning a process.

## Verify

Run all three from the repo root. All three must pass before a PR opens.

```
npm run lint
npm test
npm run build
```

## Architecture decisions that are already made

- **ADR-001: static analysis, not an LLM.** Partitioning is deterministic and runs
  in-process. Never send diff content to a model API or any other external service. The
  score gates merges, so the same diff must always give the same answer.
- **ADR-002: no licensing backend.** The free tool has no seat checks, license keys, or
  telemetry. A paid tier would be a separate product with its own ADR.

## Won't (this version)

Carried from the spec. If a roadmap item seems to need one of these, stop and flag it.

- **The paid tier**: org-wide dashboards, Slack/Teams alerts, cross-repo policy enforcement.
- **Languages beyond TypeScript/JavaScript and Python.**
- **A hosted web UI or backend service.** The CLI, the Action, and PR comments are the whole
  surface. No server, no database, no auth. (The GitHub Pages demo is static and
  client-side; it is not a backend.)
- **Automatic force-merge or auto-approval of any layer.** DiffCarve scores and blocks; it
  never approves on a human's behalf.
- **Merge or rebase conflict resolution within a stack.** GitHub's Stacked PRs own that.

## Standards

- No new runtime dependency without a line in the PR body saying why. ts-morph and
  `yaml` (for `diffcarve.yml`) are expected; most other things are a few lines of code.
- The build plan's edge cases are tests, not afterthoughts: an empty diff, a one-file diff,
  and a diff under the threshold each do nothing and say why.
- Analysis on a diff at the default threshold finishes in under 60 seconds.
- Nothing leaves the CI runner or the developer's machine except the PR comment or check
  DiffCarve itself posts through `GITHUB_TOKEN`.
- This repo goes public at graduation. Never commit `.env*`, tokens, real personal data, or
  local paths like `C:\Users\...` or `D:\...`. Spike fixtures come from public PRs.
- Commit messages: plain imperative sentences ("Add the import-graph layering pass"), no
  Conventional Commit prefixes.

## What "done" means for a roadmap item

1. The item's own text is true of the code, checked by running it.
2. `npm run lint`, `npm test` and `npm run build` pass, and new behavior has a test.
3. Anything the change made untrue is fixed: `README.md`, `docs/`, this file.
4. `docs/CHANGELOG.md` has a line for it, tagged with the roadmap phase in italics, in the
   same commit that flips the box to `- [x]` with a dated note.
5. It's on a `roadmap/auto-<date>` branch with a PR into `main`. Never push to `main`.
