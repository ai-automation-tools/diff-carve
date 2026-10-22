# Build plan: DiffCarve MVP

> Copied from the DiffCarve business plan (`Business-Plans/diff-carve/build/build-plan.md` in the private pipeline workspace) on 2026-09-22. The slices here became the build gates in [`docs/ROADMAP.md`](../ROADMAP.md).

**Spec:** [spec.md](spec.md) · **Architecture:** ADR-001 (static import-graph analysis, not an LLM) and ADR-002 (no licensing backend), summarized in [AGENTS.md](../../AGENTS.md)

Sequenced for this org's one-roadmap-item-per-week cadence. Each slice below is sized to roughly one week, per `models/estimate.py`, and ships something a person can look at — no slice is "half the analyzer, invisible until next week."

## Slice 0 — Walking skeleton: the spike

**Delivers:** `diffcarve analyze <branch>` run locally (no packaging, no Action, no config file) against ten real oversized PRs — a mix of Mike's own repos and public open-source PRs, per the idea card's own next step.
**De-risks:** the decision memo's key assumption — that import-graph analysis produces layers a human reviewer would call sensible, not arbitrary, on real AI-authored diffs.
**Done when:** all ten PRs have been run, each output judged pass/fail by a human reviewer against "would I trust this split," and the pass rate is recorded in the repo's own README or a `SPIKE_RESULTS.md`, not just in someone's head.

## Slice 1 — CLI core: scoring and `--dry-run` output

- **Delivers:** the Must-story `cli_scoring_dryrun` — reviewability score per layer, formatted `--dry-run` output.
- **De-risks:** whether the score (lines, files, complexity delta, reverse-dependency count) actually tracks with the spike's human judgment of "sensible" from Slice 0. If a layer humans rejected in the spike scores *well*, the score is measuring the wrong thing and needs to change before anything is built on top of it.
- **Done when:** running the CLI against the same ten spike PRs produces a score alongside each layer, and the score's pass/fail threshold roughly agrees with the human judgments recorded in Slice 0.

## Slice 2 — Config: `diffcarve.yml`

- **Delivers:** the Must-story `config_yml` — line budget, complexity threshold, file-boundary rules, all configurable instead of hardcoded.
- **De-risks:** nothing new technically; this is necessary plumbing before the Action (Slice 3) has anything to read.
- **Done when:** the CLI reads a `diffcarve.yml` and the spike's threshold behavior changes when the config changes.

## Slice 3 — GitHub Action wrapper (dry-run only)

- **Delivers:** the Action triggers on PR open, checks the diff against the configured threshold, and posts the `--dry-run` comment. No merge blocking yet.
- **De-risks:** the CI packaging and permissions model — does the Action run cleanly in a real repo's CI, within the spec's 60-second budget, without needing secrets or external calls.
- **Done when:** deployed to a real test repo (one of Mike's own), a PR that crosses the threshold gets a comment; one that doesn't, gets silence, per the spec's acceptance criteria.

## Slice 4 — Stacked PR chain creation (highest-risk slice)

- **Delivers:** with `--dry-run` off, the Action opens the partitioned layers as a real GitHub Stacked PR chain instead of a comment.
- **De-risks:** the schedule-owning risk from `build/estimate.md` — whether GitHub's Stacked PR API supports this programmatically at all today. This is deliberately sequenced *after* the dry-run Action ships and gets real signal, not before, so that if the API turns out to be missing pieces, the free tool is still useful (dry-run mode) while that's sorted out.
- **Done when:** a real oversized PR on a test repo gets automatically split into a live Stacked PR chain, and the layers rebase correctly if a lower layer merges first (GitHub's own stacking behavior, verified end to end).

## Slice 5 — Merge-blocking check + override

- **Delivers:** the reviewability score becomes an actual PR check that blocks merge when a layer fails threshold, with a second-reviewer override path.
- **De-risks:** the strongest counterargument from the decision memo — whether a merge-blocking check built on this scoring is something a tech lead actually leaves turned on. This ships last among the enforcement features specifically so real dry-run usage data (Slice 3-4) informs the default threshold before anything blocks a real merge.
- **Done when:** a failing layer blocks merge on the test repo, and an authorized override unblocks it with an audit log entry.

## Slice 6 — Python support

- **Delivers:** the Should-story — `ast`-based analysis as a second supported language.
- **De-risks:** whether the TypeScript-specific approach (ADR-001) generalizes, or whether each language needs meaningfully different tuning — informs whether a third language later is cheap or expensive.
- **Done when:** the same spike-style validation (a handful of real Python PRs, not necessarily all ten) passes at a comparable rate to the TypeScript results from Slice 0.

## Slice 7 — Docs and the GitHub Pages demo

- **Delivers:** the client-side demo required by this org's build model — paste or pick a sample diff, see it carved into layers, no backend. README, install docs, MIT license file.
- **De-risks:** nothing technical; this is the distribution slice. `models/roi.py`'s tornado sweep says `awareness_rate` is one of the two dominant drivers of the whole outcome — a demo nobody can find doesn't move it.
- **Done when:** the GitHub Pages site is live, shows a real carved example without requiring install, and the repo README links it above the fold.

## Definition of done

Every slice: acceptance criteria from `spec.md` pass, including the empty-diff and single-file-PR edge cases (a diff under the threshold does nothing; a diff of one file has nothing to partition and says so, not an error). No secrets or source code leave the CI environment (ADR-001). Deployed means running against a real repo Mike controls, not merged-but-unverified.

## Cut list (if the estimate runs over)

**Could → cut first:** second-reviewer override, additional file-boundary presets. **Should → cut next:** Python support (Slice 6) and native Stacked PR chain creation (Slice 4) can both ship later as fast-follows; a dry-run-only, TypeScript-only tool (Slices 0-3) is still a complete, useful, demoable thing on its own. **Must is defended:** if the spike (Slice 0) fails its own bar, that's not a scope cut, it's the falsifier from the decision memo — stop and reopen the spec, don't quietly ship a weaker version of the core loop.

## What we learn, and when we'd stop

The earliest real test of the memo's bet is **Slice 0**, in week one: does static import-graph analysis produce layers a human trusts on real, messy, AI-authored PRs. Quoted from the decision memo's falsifiers: *"If the ten-PR spike produces layers a reviewer would call arbitrary or unreviewable on more than half the sample by the time the spike is done, the core assumption is wrong and DiffCarve should be parked, not shipped as a merge-blocking tool."* Everything from Slice 1 onward assumes that bar was cleared. If it wasn't, the right move is publishing the spike's findings (useful either way) and returning the roadmap slot to the next candidate in `PIPELINE.md`, not pushing forward on a foundation that already failed its own test.

---

<p align="center">
  <a href="spec.md">← Spec</a> ·
  <a href="README.md">↑ Product docs</a>
</p>
