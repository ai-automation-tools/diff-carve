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
> **Early CLI.** `diffcarve analyze <branch>` prints dependency-ordered layers with a
> reviewability score on each, and `--dry-run` prints the same thing as a PR comment.
> No config file and no Action yet. On ten real oversized PRs the layers came out sensible
> on 6 ([results](docs/SPIKE_RESULTS.md)), signed off as enough to keep building. See the
> [roadmap](docs/ROADMAP.md).

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
| **Reviewability score** | ✅ Built. 0 to 100 per layer, pass at 50, with the lines, files, complexity delta and reverse dependencies behind it |
| **`--dry-run`** | ✅ Built. Prints the proposed stack as PR-comment markdown; posting it is the Action's job (Slice 3) |
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

# 4. The same stack as the markdown a PR comment would carry
node dist/cli.js analyze my-feature-branch --dry-run

# 5. Tests and lint
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
