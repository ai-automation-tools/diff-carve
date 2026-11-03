<h1 align="center">🧰 Source</h1>

<p align="center">
  <em>The DiffCarve CLI. It reads a branch's diff from git, cuts it into import-ordered layers, and scores each one.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 6.0">
  <a href="../README.md"><img src="https://img.shields.io/badge/↩-repository_root-6B7280?style=for-the-badge" alt="Repository root"></a>
</p>

---

| File | What it does |
|:---|:---|
| [**cli.ts**](cli.ts) | The `diffcarve` bin entry. Hands `argv` to `run()` and sets the exit code. |
| [**action.ts**](action.ts) | `action(env, log, http)` runs the dry-run GitHub Action for one `pull_request` event: carves head against base, stays silent under the threshold (the `threshold` input, else `diffcarve.yml` on the base), otherwise posts or updates the one comment that starts with `MARKER`. `action-main.ts` is the entry `action.yml` runs. |
| [**run.ts**](run.ts) | Command dispatch and output formatting: `format()` for the terminal, `markdown()` for `--dry-run`. Takes an `io` pair and a `cwd` instead of touching `process`, so tests can call it. |
| [**analyze.ts**](analyze.ts) | `analyze(cwd, branch, base, exclude)` lists the branch's changes since its merge base with `base` (HEAD by default), builds an in-memory ts-morph import graph over the changed TS/JS files not matching an `exclude` glob (resolving relative imports, tsconfig/jsconfig `paths` and package.json `imports`, read from the branch), and `layer()` orders them into layers (import cycles share one). Also records lines changed and the complexity delta per file. |
| [**score.ts**](score.ts) | `scoreLayers(a, config)` gives each layer a 0 to 100 reviewability score from its lines, files, complexity delta and reverse dependencies, against the config's budgets and fixed `WEIGHTS`. `complexity()` counts branch points. |
| [**config.ts**](config.ts) | `loadConfig(cwd, ref)` reads `diffcarve.yml` from a git ref (defaults when there's none); `parseConfig()` merges it over `DEFAULTS` and throws on unknown keys or wrong types. |

Tests live in [`../tests/`](../tests/) and import these files directly (`fixture.ts` builds the throwaway git repos they carve); Node strips
the types at runtime, so there's no build step before `npm test`.

---

<p align="center">
  <a href="../README.md">← Repository home</a>
</p>
