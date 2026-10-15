<h1 align="center">🗺️ DiffCarve Roadmap</h1>

<p align="center">
  <em>Everything between an empty CLI and a public, demoable DiffCarve, in the order it has to happen.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/stage-incubating-F59E0B?style=for-the-badge" alt="Stage: incubating">
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs-6B7280?style=for-the-badge" alt="Docs home"></a>
</p>

---

One item per weekly run. Take the first open box from the top. Every item above
[After public release](#after-public-release) is a release gate: DiffCarve goes public
when all of them read `- [x]`.

Markers: `- [ ]` open · `- [-]` claimed by a run in progress · `- [x]` done ·
`- [!]` blocked, reason on the line · `🔒 Needs Mike` only Mike can do it.

The slices come from [product/build-plan.md](product/build-plan.md). Slices 4 to 6
(stacked PR chains, merge blocking, Python) sit below the release line because the build
plan's own cut list says a dry-run-only, TypeScript-only tool is complete without them.

## 🔨 Build

- [x] **Slice 0a: the spike analyzer.** _(done 2026-09-23: `src/analyze.ts`; relative imports only, tsconfig `paths` aliases not resolved yet)_ `diffcarve analyze <branch>` builds a ts-morph import graph over the files a branch changes versus its merge base and prints dependency-ordered layers, where no layer imports from a later one. A diff of one file says there's nothing to partition; an empty diff says so too. Neither is an error. Unit tests cover a fixture repo with a known schema → data → API → UI layering and assert that order.
- [x] **Slice 0b: run the spike.** _(done 2026-09-30: [SPIKE_RESULTS.md](SPIKE_RESULTS.md); proposed 6 of 10 sensible, 3 misses from unresolved path aliases, see [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md))_ Pick ten public, merged, open-source TS/JS PRs over 400 changed lines, preferring ones an AI agent wrote. Run the analyzer on each and write `docs/SPIKE_RESULTS.md` with the PR links, each layer breakdown, the analysis time, and a proposed sensible/arbitrary verdict with a one-line reason per PR.
- [x] 🔒 Needs Mike: **spike sign-off.** _(done 2026-10-12: Mike signed off on the results as they stand, 6 of 10 sensible; applied 2026-10-14)_ Read `docs/SPIKE_RESULTS.md` and record the real verdict per PR in it. 7 or more sensible out of 10 passes. At 5 or fewer, the decision memo's falsifier applies: park DiffCarve and publish the findings instead of building on.
- [ ] **Slice 1: reviewability score and `--dry-run` output.** Each layer gets a numeric score plus the inputs behind it (lines changed, files touched, cyclomatic complexity delta, reverse-dependency count). `--dry-run` prints the proposed stack as the markdown a PR comment would carry. Re-run on the ten spike PRs and record in `SPIKE_RESULTS.md` whether the score's pass/fail line agrees with the verdicts.
- [ ] **Slice 2: `diffcarve.yml`.** Line budget, trigger threshold, complexity threshold, and per-language file-boundary rules read from `diffcarve.yml`, with the defaults documented. A test proves changing the config changes the output.
- [ ] **Slice 3: the GitHub Action, dry-run only.** An `action.yml` at the repo root runs on `pull_request` opened/synchronize. Under the threshold it does nothing: no comment, no check. Over it, it posts or updates one dry-run comment. Needs only `GITHUB_TOKEN`, makes no calls outside GitHub, and finishes in under 60 seconds. Proven on this repo's own PRs through a workflow that uses `./`, not a published tag.

## 🚦 Public release

- [ ] **CI.** `.github/workflows/ci.yml` runs `npm ci`, `npm run build`, `npm test` and `npm run lint` on push to `main` and on every PR, and the latest run on `main` is green.
- [ ] **README usage matches the code.** Every command, flag, config key, and Action input in the README was run against the real build and behaves as written.
- [ ] **Security.** `SECURITY.md` says how to report a vulnerability. A full-history secret scan (`gitleaks detect --log-opts="--all"` or equivalent) comes back clean, and the command and result are recorded in the PR that ticks this box.
- [ ] **Live demo at `https://ai-automation-tools.dev/diff-carve/`.** Served by GitHub Pages from this repo through a `actions/deploy-pages` workflow. A visitor picks a bundled sample diff and sees it carved into scored layers with nothing to install. The org source bar sits across the very top, linking `https://github.com/ai-automation-tools/diff-carve`.
- [ ] **Demo is safe to publish.** The sample diffs come from public open-source PRs or are synthetic. No real personal data, no local paths, and no network call that needs a secret.
- [ ] **README hero points at the demo.** The Live Demo badge and nav links resolve to the Pages URL above the fold.

## After public release

These don't block graduation.

### 🧩 Fast-follow slices

- [ ] **Slice 4: stacked PR chain creation.** With `--dry-run` off, the Action opens the layers as a real GitHub Stacked PR chain. Check first whether the Stacked PR API can be called from an Action at all; if it can't, record what's missing in `docs/` and stop there.
- [ ] **Slice 5: merge-blocking check with override.** A failing layer gets a failing check. A named second reviewer can override it, and the override leaves an audit entry.
- [ ] **Slice 6: Python support.** A Python analyzer (the `ast` module) passes a smaller spike at a rate comparable to Slice 0's TypeScript results.

### 📣 Publish & promote

- [ ] Publish the Action to the GitHub Marketplace. 🔒 Needs Mike
- [ ] Publish the CLI to npm as `diffcarve` (check the name is still free first). 🔒 Needs Mike
- [ ] Launch post with one real before/after carve, sent to the two or three places tech leads running AI agents read. 🔒 Needs Mike
- [ ] Custom subdomain `diff-carve.ai-automation-tools.dev`. 🔒 Needs Mike

### 💰 Monetize

- [ ] Decide whether a paid tier (org dashboards, Slack/Teams alerts, cross-repo policy) is worth scoping, using star, fork, and Marketplace-install counts. Its own ADR if yes. 🔒 Needs Mike

---

<p align="center">
  <a href="README.md">← Docs home</a> ·
  <a href="CHANGELOG.md">Next: Changelog →</a>
</p>
