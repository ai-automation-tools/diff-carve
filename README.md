<a id="readme-top"></a>

<h1 align="center">🪚 DiffCarve</h1>

<p align="center">
  <em>Takes the 1,500-line pull request your coding agent just opened<br>and cuts it into a stack of small PRs, ordered by what imports what.</em>
</p>

<p align="center">
  <a href="docs/README.md"><strong>Explore the docs »</strong></a>
</p>

<p align="center">
  <a href="docs/ROADMAP.md">Roadmap</a>
  ·
  <a href="https://github.com/ai-automation-tools/diff-carve/issues">Report Bug</a>
  ·
  <a href="https://github.com/ai-automation-tools/diff-carve/issues">Request Feature</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-MVP_Prototype-F59E0B?style=for-the-badge" alt="Status: MVP prototype">
  <a href="docs/ROADMAP.md"><img src="https://img.shields.io/badge/plan-ROADMAP-8B5CF6?style=for-the-badge" alt="Roadmap"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2ea44f?style=for-the-badge" alt="License: MIT"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-22.18+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 22.18+">
  <img src="https://img.shields.io/badge/ts--morph-import_graph-6B7280?style=flat-square" alt="ts-morph">
  <img src="https://img.shields.io/badge/GitHub_Actions-planned-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="GitHub Actions">
</p>

---

> [!WARNING]
> **Spike stage.** `diffcarve analyze <branch>` prints dependency-ordered layers, and that's
> all it does so far: no score, no config, no Action. It has been run on ten real oversized
> PRs ([results](docs/SPIKE_RESULTS.md)) and is waiting on a human verdict: if half or fewer
> come out sensible, the project stops there. See the [roadmap](docs/ROADMAP.md).

## 💡 What it's for

Coding agents write a whole feature in one go, so the PRs they open are big and reviewers
haven't sped up to match. GitHub now has stacked pull requests, but somebody still has to
decide where to cut. DiffCarve makes that call from the code itself: it builds an import
graph over the changed files and splits the diff into layers where nothing depends on a
later layer. Each layer gets a reviewability score, so you know which ones to skim.

It runs as a CLI on your machine or as a GitHub Action in your own CI. There's no
DiffCarve server, and your source code never leaves the runner.

## 📊 Features

| Feature | Status |
|:---|:---|
| **`diffcarve analyze <branch>`** | ✅ Built. Dependency-ordered layers from a ts-morph import graph (relative imports; `paths` aliases not yet) |
| **Reviewability score** | Slice 1. Lines, files, complexity delta, reverse dependencies, shown per layer |
| **`--dry-run`** | Slice 1. The proposed stack as a PR comment, blocking nothing |
| **`diffcarve.yml`** | Slice 2. Line budget, trigger threshold, per-language boundary rules |
| **GitHub Action** | Slice 3. Stays silent under the threshold, comments over it |
| **Stacked PR chains, merge gate, Python** | After public release |

## 🚀 Quick start

```bash
# 1. Install dependencies (Node 22.18 or newer)
npm install

# 2. Build the CLI into dist/
npm run build

# 3. Carve a branch. Run it from the branch the PR targets:
#    it diffs <branch> against its merge base with HEAD.
node dist/cli.js analyze my-feature-branch

# 4. Tests and lint
npm test && npm run lint
```

## 🗂️ What's in here

| Folder | What's inside |
|:---|:---|
| [**📚 docs/**](docs/README.md) | The roadmap, the changelog, and the product spec and build plan. |
| [**🧰 src/**](src/README.md) | The CLI source. |
| [**🧪 test/**](test/) | Tests for `node --test`, run straight from TypeScript. |
| [**🤖 CLAUDE.md**](CLAUDE.md) | Standing orders for the agent that works the roadmap each week. |

---

<p align="center">
  Built with <a href="https://www.typescriptlang.org/">TypeScript</a> and <a href="https://ts-morph.com/">ts-morph</a> · <a href="docs/README.md">Docs</a> · <a href="LICENSE">MIT License</a>
</p>

<p align="right">(<a href="#readme-top">back to top</a>)</p>
