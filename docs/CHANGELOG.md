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
- Reviewability score: each layer scores 0 to 100 (pass at 50) and shows its inputs, lines changed, files touched, cyclomatic complexity delta (branch points after minus before) and reverse-dependency count. `diffcarve analyze <branch> --dry-run` prints the proposed stack as PR-comment markdown. Re-run on the ten spike PRs, the score's pass/fail agrees with the verdicts on 6 of 10, recorded in `SPIKE_RESULTS.md`. *Build: Slice 1*

**Docs**
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
