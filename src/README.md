<h1 align="center">🧰 Source</h1>

<p align="center">
  <em>The DiffCarve CLI. It reads a branch's diff from git and cuts it into import-ordered layers.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 6.0">
  <a href="../README.md"><img src="https://img.shields.io/badge/↩-repository_root-6B7280?style=for-the-badge" alt="Repository root"></a>
</p>

---

| File | What it does |
|:---|:---|
| [**cli.ts**](cli.ts) | The `diffcarve` bin entry. Hands `argv` to `run()` and sets the exit code. |
| [**run.ts**](run.ts) | Command dispatch and output formatting. Takes an `io` pair and a `cwd` instead of touching `process`, so tests can call it. |
| [**analyze.ts**](analyze.ts) | `analyze(cwd, branch)` lists the branch's changes since its merge base, builds an in-memory ts-morph import graph over the changed TS/JS files, and `layer()` orders them into layers (import cycles share one). |

Tests live in [`../test/`](../test/) and import these files directly; Node strips
the types at runtime, so there's no build step before `npm test`.

---

<p align="center">
  <a href="../README.md">← Repository home</a>
</p>
