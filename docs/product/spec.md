# Spec: DiffCarve MVP

> Copied from the DiffCarve business plan (`Business-Plans/diff-carve/build/spec.md` in the private pipeline workspace) on 2026-09-22. This copy is the one the roadmap works from.

**Decision it serves:** the plan's decision memo (private) · **Status:** draft
**The bet being tested:** dependency-ordered import-graph analysis can partition a real, messy, AI-agent-authored diff into layers a human reviewer would actually find sensible.

## Users & jobs

**Tech lead / staff engineer at a 20-200 engineer org** where most of the team uses Claude Code, Cursor, or Copilot `[assum, idea card's stated target user — not independently validated by interview]`. Job: when an AI agent opens a large PR, get it split into a reviewable stack without training every engineer to stack commits manually.

**Individual contributor whose agent just opened the big PR.** Job: run one command and see a proposed split before ever opening a pull request, so review friction doesn't become a reason to avoid the review process.

Both jobs are traced to `analysis/landscape.md` (the gap: existing tools navigate a stack you already decided to build; nobody decides *where to cut* one) rather than to an observed customer switch — there is no existing DiffCarve user to interview. Tag: `[assum]`, hypothesis-stage, sharpened by the spike in Slice 0 of the build plan.

## In scope (this version)

### Must

- **Spike: partition ten real oversized PRs** — As a maintainer, I want the import-graph partitioning logic run against ten real, messy, AI-authored PRs (mix of Mike's own repos and public open-source PRs, per the idea card's own next step), so that the core technical bet is tested before any Action or merge-gate work begins.
  - AC: Given ten PRs each over 400 changed lines, When `diffcarve analyze <branch>` runs against each, Then the tool produces a layer breakdown for at least 7 of the 10 that a reviewer (Mike) judges "sensible" — files grouped by real dependency relationship, not arbitrary line-count buckets.

- **CLI partitioning (`diffcarve analyze <branch>`)** — As an engineer, I want a diff partitioned into dependency-ordered logical layers using file/module boundaries and import-graph analysis, so that the split reflects real code structure instead of blind line-count chunking.
  - AC: Given a branch with changes across N files, When `diffcarve analyze` runs, Then it outputs an ordered list of layers where no layer imports from a layer that comes after it.

- **Reviewability score per layer** — As a reviewer, I want each proposed layer scored (lines changed, files touched, cyclomatic complexity delta, reverse-dependency count), so that I know which layers are safe to skim and which need real attention.
  - AC: Given a partitioned diff, When the score is computed, Then each layer reports a numeric score and the specific inputs that produced it (not just a pass/fail).

- **`--dry-run` mode** — As a tech lead evaluating the tool, I want to see the proposed stack as a PR comment without anything being blocked or enforced, so that I can judge quality before turning on any gate.
  - AC: Given `--dry-run` is set, When a PR opens, Then a comment posts the proposed layer breakdown and score, and the PR is mergeable exactly as if DiffCarve weren't installed.

- **GitHub Action, threshold-triggered** — As a repo admin, I want the Action to run on PR open and act only when the diff crosses a configured line/file threshold, so that small PRs are never touched.
  - AC: Given `diffcarve.yml` sets a threshold, When a PR's diff is under it, Then the Action takes no action at all (no comment, no check).

- **`diffcarve.yml` config** — As a repo admin, I want line budget, complexity threshold, and file-boundary rules configurable per language, so that the tool fits our repo's own conventions instead of a fixed default.
  - AC: Given a `diffcarve.yml` with a custom line budget, When the Action runs, Then it uses the configured value, not a hardcoded default.

- **TypeScript/JavaScript support (via ts-morph import graph)** — As an engineer on a TS/JS repo, I want accurate partitioning based on real import relationships.
  - AC: Given a TS/JS diff with a clear layering (schema → data access → API → UI), When analyzed, Then the layers come out in that dependency order.

### Should

- **Python support (via the standard `ast` module)** — second language, ships after TypeScript is validated in the spike and Slice 1.
- **Native GitHub Stacked PR chain creation** — the Action opens the partitioned layers as an actual GitHub Stacked PR chain (not just a comment) once `--dry-run` is turned off.

### Could

- **Second reviewer override** — a named reviewer can override a failing reviewability check and force-merge, logged for audit.
- **Additional file-boundary rule presets** (monorepo-aware, common framework conventions) beyond the MVP's basic per-language defaults.

## Explicitly out of scope (Won't, this version)

- **The paid tier** (org-wide dashboards, Slack/Teams alerts, cross-repo policy enforcement) — this is a v2 decision that depends on the free tier actually getting adopted; building it now is exactly the "1% of TAM" mistake this pipeline's evidence rules warn against.
- **Languages beyond TypeScript/JavaScript and Python** — every additional language is a new import-graph or AST integration; the idea card scopes to two for a reason.
- **A hosted web UI or backend service** — the CLI, the Action, and PR comments are the whole surface. No server to run, no database, no auth system. This keeps the project buildable in static/client-side form and free to run indefinitely.
- **Automatic force-merge or auto-approval of any layer** — DiffCarve scores and blocks; it never approves on a human's behalf.
- **Support for merge/rebase conflict resolution within a stack** — GitHub's native Stacked PR feature owns that; DiffCarve only decides the initial cut.

## Non-functional requirements

- **Runs entirely client-side / in CI** — no DiffCarve-operated backend, consistent with the org's static/client-side-demo model. The GitHub Action runs in the repo's own CI runner; the CLI runs on a developer's machine. `[assum: this org's build model, per pipeline instructions]`.
- **Analysis time budget:** partitioning a diff under the configured threshold (default assumed 400 changed lines, `[assum]`, tunable via config) completes in under 60 seconds in CI, so it doesn't become the slow step in a PR's checks. No existing benchmark for this; first real measurement happens during the spike.
- **No data leaves the repo's own CI environment** — diff content is analyzed in-process; nothing is sent to an external service. Relevant because the tool handles proprietary source code.
- **Target platforms:** GitHub only for v1 (the Action depends on GitHub's Stacked PR primitive specifically, per `analysis/landscape.md`); the CLI itself has no GitHub dependency and could target other forges later.
- **License:** MIT for the free tier, consistent with the idea card and with the org's existing open-source posture.

## Open questions

- **Does the import-graph analysis actually work well enough on messy diffs?** Owner: the spike (build plan Slice 0). Answer needed before Slice 1 (the GitHub Action) is scoped in detail.
- **What line/file threshold should ship as the default?** `[assum]` placeholder of 400 lines is a guess; the spike's ten real PRs should suggest a more grounded default.
- **Does GitHub's Stacked PR API support programmatic stack creation from an Action today, or only from the `gh` CLI/UI?** Unverified — `research/github-stacked-prs-changelog.md` confirms a `gh` CLI extension exists but doesn't confirm a stable Action-callable API. This is a build-plan risk, not resolved here.

---

<p align="center">
  <a href="README.md">← Product docs</a> ·
  <a href="build-plan.md">Next: Build plan →</a>
</p>
