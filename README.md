<a id="readme-top"></a>

<h1 align="center">🪚 DiffCarve</h1>

<p align="center">
  <em>Takes the 1,500-line pull request your coding agent just opened<br>and cuts it into a stack of small PRs, ordered by what imports what.</em>
</p>

<p align="center">
  <a href="docs/README.md"><strong>Explore the docs »</strong></a>
</p>

<p align="center">
  <a href="https://ai-automation-tools.dev/diff-carve/">Live Demo</a>
  ·
  <a href="docs/ROADMAP.md">Roadmap</a>
  ·
  <a href="https://github.com/ai-automation-tools/diff-carve/issues">Report Bug</a>
  ·
  <a href="https://github.com/ai-automation-tools/diff-carve/issues">Request Feature</a>
</p>

<p align="center">
  <a href="https://ai-automation-tools.dev/diff-carve/"><img src="https://img.shields.io/badge/live_demo-ai--automation--tools.dev%2Fdiff--carve-E879F9?style=for-the-badge&logo=github&logoColor=white" alt="Live demo at ai-automation-tools.dev/diff-carve"></a>
  <img src="https://img.shields.io/badge/status-MVP_Prototype-F59E0B?style=for-the-badge" alt="Status: MVP prototype">
  <a href="docs/ROADMAP.md"><img src="https://img.shields.io/badge/plan-ROADMAP-8B5CF6?style=for-the-badge" alt="Roadmap"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2ea44f?style=for-the-badge" alt="License: MIT"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-22.18+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 22.18+">
  <img src="https://img.shields.io/badge/ts--morph-import_graph-6B7280?style=flat-square" alt="ts-morph">
  <img src="https://img.shields.io/badge/GitHub_Actions-dry--run-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="GitHub Actions">
</p>

---

> [!WARNING]
> **Early CLI and Action.** `diffcarve analyze <branch>` prints dependency-ordered layers
> with a reviewability score on each, and `--dry-run` prints the same thing as a PR comment.
> The GitHub Action posts that comment on PRs over 400 changed lines. Thresholds and score budgets come from an optional [`diffcarve.yml`](#configuration-diffcarveyml). On ten real oversized PRs the layers came out sensible
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
| **`diffcarve analyze <branch>`** | ✅ Built. Dependency-ordered layers from a ts-morph import graph (relative imports, tsconfig `paths` and package.json `imports` aliases) |
| **Reviewability score** | ✅ Built. 0 to 100 per layer, pass at 50 by default, with the lines, files, complexity delta and reverse dependencies behind it |
| **`--dry-run`** | ✅ Built. Prints the proposed stack as PR-comment markdown |
| **`diffcarve.yml`** | ✅ Built. Trigger threshold, pass line, line/file/complexity/reverse-dep budgets, and per-language `exclude` globs, read from the branch the PR targets |
| **GitHub Action** | ✅ Built. Silent under the threshold (400 changed lines by default), otherwise posts or updates one comment. Needs only `GITHUB_TOKEN` |
| **Stacked PR chains** | ✅ Built, opt-in. With `dry-run: false` the Action also opens the layers as a [GitHub stack](https://docs.github.com/en/rest/pulls/stacks) of PRs, once per PR |
| **[Live demo](https://ai-automation-tools.dev/diff-carve/)** | ✅ Built. Pick a sample PR and see it carved into scored layers in the browser. The samples are synthetic and carved by the real CLI when the page builds |
| **Merge gate, Python** | After public release |

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

# 6. Build the demo page into _site/ (open _site/index.html)
npm run demo
```

### As a GitHub Action

```yaml
# .github/workflows/diffcarve.yml
on:
  pull_request:
    types: [opened, synchronize]
permissions:
  contents: read
  pull-requests: write
jobs:
  carve:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # the merge base has to be in the clone
      - uses: ai-automation-tools/diff-carve@main
        with:
          threshold: 400 # optional: overrides diffcarve.yml's threshold
```

It never blocks or approves anything. On a fork's PR the token can't comment, so the step
logs a warning and passes.

**Opening the stack for real.** Add `dry-run: false` under `with:` and grant
`contents: write` next to `pull-requests: write`. Over the threshold, the Action then builds
one branch per layer (`diffcarve/<pr>/layer-<n>`, each the layers below it plus its own
files as they are at the PR head, with deleted and non-TS/JS files in the top layer), opens
a PR for each based on the one below, joins them with GitHub's
[Stacks API](https://docs.github.com/en/rest/pulls/stacks) (public preview), and names
them in its comment. It carves each PR once: later pushes leave the stack alone until you
delete the `diffcarve/<pr>/` branches. The original PR stays open, and nothing is merged,
closed or approved. PRs a workflow opens with `GITHUB_TOKEN` don't trigger other workflows,
so CI won't run on the layer PRs until someone pushes to them; pass a PAT or GitHub App
token as `token` if you need it to. It runs `actions/setup-node` with Node 22 first, so later steps
in the job see that Node.

### Configuration: `diffcarve.yml`

Optional, at the repo root. The CLI reads it from HEAD and the Action from the PR's base
branch, so a PR can't loosen its own budgets. Every key is optional; these are the
defaults. An unknown key or a wrong type stops the run and names the key.

```yaml
threshold: 400       # lines changed (added plus deleted) before the Action comments
pass: 50             # a layer scoring this or more passes (0 to 100)
budgets:             # a layer exactly on every budget scores 50
  lines: 200         # lines changed
  files: 10          # files touched
  complexity: 20     # cyclomatic complexity added: the complexity threshold
  reverseDeps: 5     # changed files outside the layer that import it
languages:
  typescript:        # TS and JS
    exclude: []      # globs kept outside the import graph, e.g. ["**/*.generated.ts"]
```

## 🗂️ What's in here

| Folder | What's inside |
|:---|:---|
| [**📚 docs/**](docs/README.md) | The roadmap, the changelog, and the product spec and build plan. |
| [**🧰 src/**](src/README.md) | The CLI and Action source. |
| [**⚙️ action.yml**](action.yml) | The GitHub Action. [`.github/workflows/diffcarve.yml`](.github/workflows/diffcarve.yml) runs it on this repo's own PRs; [`ci.yml`](.github/workflows/ci.yml) builds, tests and lints every push and PR. |
| [**🎬 demo/**](demo/) | The live demo: sample PRs, the page template, and `build.ts`, which carves the samples with the real CLI. [`pages.yml`](.github/workflows/pages.yml) builds it on every PR and deploys it to GitHub Pages from `main`. |
| [**🧪 tests/**](tests/) | Tests for `node --test`, run straight from TypeScript. |
| [**🔒 SECURITY.md**](SECURITY.md) | How to report a vulnerability privately. |
| [**🤖 AGENTS.md**](AGENTS.md) | Standing orders for the agent that works the roadmap each week. `CLAUDE.md` imports it for Claude Code. |

---

<p align="center">
  Built with <a href="https://www.typescriptlang.org/">TypeScript</a> and <a href="https://ts-morph.com/">ts-morph</a> · <a href="docs/README.md">Docs</a> · <a href="LICENSE">MIT License</a>
</p>

<p align="right">(<a href="#readme-top">back to top</a>)</p>
