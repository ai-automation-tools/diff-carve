<h1 align="center">📋 DiffCarve Changelog</h1>

<p align="center">
  <em>What changed in DiffCarve, newest first.</em>
</p>

<p align="center">
  <a href="ROADMAP.md"><img src="https://img.shields.io/badge/plan-ROADMAP-8B5CF6?style=for-the-badge" alt="Roadmap"></a>
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs-6B7280?style=for-the-badge" alt="Docs home"></a>
</p>

---

Entries that close a roadmap item carry the roadmap phase in italics.

## Unreleased

**Added**
- `docs/UPSTREAMS.md` and `.github/dependabot.yml`: the upstream worklist for the biweekly upstream check, and weekly grouped minor/patch Dependabot updates for npm and GitHub Actions.
- `diffcarve.yml`: the trigger threshold, the pass line, the four score budgets (lines, files, complexity, reverse deps) and per-language `exclude` globs, all optional over documented defaults and read from the branch the PR targets. Unknown keys and wrong types fail with the key named. The Action's `threshold` input now defaults to empty, so the config's value applies unless the input is set. Adds the `yaml` dependency. *Fast-follow: Slice 2*
- Live demo at https://ai-automation-tools.dev/diff-carve/: pick one of four synthetic sample PRs (a layered feature, path aliases with a failing layer, two unrelated changes, a one-file fix) and see its layers, scores, the PR comment the Action would post, the CLI output and the diff. `demo/build.ts` (`npm run demo`) carves the samples with the real CLI at build time; the page is static, in the org house style with the source bar on top. `.github/workflows/pages.yml` builds it on every PR and deploys it to GitHub Pages from `main`. The README carries a Live Demo badge and nav link. *Public release: Live demo*
- `.github/workflows/ci.yml`: `npm ci`, build, test and lint on every push to `main` and every PR. *Public release: CI*
- `SECURITY.md`: report vulnerabilities privately through GitHub's advisory form; a full-history `gitleaks` scan came back clean. *Public release: Security*
- GitHub Action, dry run only: `action.yml` runs on `pull_request` opened/synchronize, carves the PR head against its base, and under the threshold (400 changed lines, the `threshold` input) does nothing. Over it, it posts one comment with the proposed stack, or updates the one it posted before. Needs only `GITHUB_TOKEN` and calls nothing but the GitHub API; a fork's read-only token logs a warning instead of failing. `.github/workflows/diffcarve.yml` runs it on this repo's own PRs from `./`. `analyze()` takes an optional base ref (HEAD by default). *Build: Slice 3*
- `diffcarve analyze` resolves path aliases: tsconfig and jsconfig `paths` (from the config nearest each file, following relative `extends`) and package.json `imports`, all read from the branch. Re-run on the ten spike PRs, #5 and #9 now carve sensibly and #10 fails for the same reason as #8 (unconnected backend and frontend share layers): 8 of 10 proposed, recorded in `SPIKE_RESULTS.md`. *Build: Path aliases*
- Reviewability score: each layer scores 0 to 100 (pass at 50) and shows its inputs, lines changed, files touched, cyclomatic complexity delta (branch points after minus before) and reverse-dependency count. `diffcarve analyze <branch> --dry-run` prints the proposed stack as PR-comment markdown. Re-run on the ten spike PRs, the score's pass/fail agrees with the verdicts on 6 of 10, recorded in `SPIKE_RESULTS.md`. *Build: Slice 1*

**Changed**
- Moved to the org folder layout: the agent instructions are in `AGENTS.md` now (Codex, Gemini CLI and opencode read it), and `CLAUDE.md` is a bare `@AGENTS.md` import for Claude Code. The test folder is `tests/` instead of `test/`, with every path that named it updated.

**Docs**
- `docs/README.md` now links `UPSTREAMS.md`, which no doc pointed to before.
- README usage checked against the real build: every command, flag and Action input behaves as written, no changes needed. *Public release: README usage*
- `OPEN-QUESTIONS.md`: Mike's answer on path aliases applied; the roadmap gains a Path aliases item after Slice 1.
- 2026-10-19: release scope cut to the MVP (pipeline change, Mike). Slice 2, config, moved below `## After public release`; the demo-safety and README-hero items folded into the live-demo item; the routine now runs Mon/Wed/Fri and batches up to six `small` items. No item dropped.
- 2026-10-19: the roadmap moved onto the lab's roadmap standard: `now` and `stage` badges, an intro naming the Diff-Carve Weekly Roadmap routine, the Build section split into one heading per build-plan slice (Slices 0 and 1 marked done), done notes moved to the end of each item (`— done YYYY-MM-DD: …`), and Monetize renamed Revenue. No items added or dropped, and every state is unchanged.
- `OPEN-QUESTIONS.md`: where path-alias resolution goes on the roadmap.
- Spike signed off: Mike accepted the results as they stand, 6 of 10 sensible (2026-10-12). `SPIKE_RESULTS.md` records the verdicts and the spike gate is lifted. *Build: spike sign-off*
- `docs/SPIKE_RESULTS.md`: `diffcarve analyze` run on ten public, merged, AI-written PRs over 400 lines, with every layer breakdown, analysis times (all under 2.3s), and a proposed verdict per PR: 6 of 10 sensible, three of the misses from unresolved path aliases. Awaiting Mike's sign-off. *Build: Slice 0b*
- `docs/OPEN-QUESTIONS.md`, where the roadmap agent asks Mike for decisions.

**Added**
- `diffcarve analyze <branch>` builds a ts-morph import graph over the files a branch changes since its merge base with HEAD and prints dependency-ordered layers, with each file's imports, the files outside the graph, and the analysis time. Import cycles share a layer. Empty and one-file diffs say there's nothing to partition and exit 0. *Build: Slice 0a*

## 2026-09-22

**Added**
- Project scaffold: a TypeScript CLI that answers `--help` and `--version` and nothing else yet, with `npm run build`, `npm test` and `npm run lint` all passing.
- MIT license.

**Docs**
- Root README, docs hub, roadmap with release gates, and this changelog.
- The product spec and build plan, copied from the business plan into `docs/product/`.
- `CLAUDE.md` for the weekly roadmap agent.

---

<p align="center">
  <a href="README.md">← Docs home</a> ·
  <a href="ROADMAP.md">← Roadmap</a>
</p>
