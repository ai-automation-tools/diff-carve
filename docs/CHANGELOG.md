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

**Docs**
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
