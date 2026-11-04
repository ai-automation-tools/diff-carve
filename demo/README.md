<h1 align="center">🎬 Demo</h1>

<p align="center">
  <em>The live demo at <a href="https://ai-automation-tools.dev/diff-carve/">ai-automation-tools.dev/diff-carve</a>: pick a sample PR, see it carved into scored layers.</em>
</p>

<p align="center">
  <a href="../README.md"><img src="https://img.shields.io/badge/↩-repository_root-6B7280?style=for-the-badge" alt="Repository root"></a>
</p>

---

The page is static. Nothing is analyzed in the browser and nothing is fetched: at build time
`build.ts` commits each sample into a throwaway git repo, runs the real `analyze()`,
`scoreLayers()`, `format()` and `markdown()` on it, and bakes the results into the page as JSON.

| File | What it does |
|:---|:---|
| [**samples.ts**](samples.ts) | The sample PRs. All synthetic, written for the demo: no third-party code. |
| [**build.ts**](build.ts) | `node demo/build.ts [outDir]` (or `npm run demo`) writes `index.html` and `favicon.svg` to `_site/`. `carve()` and `buildDemo()` are exported for [`../tests/demo.test.ts`](../tests/demo.test.ts). |
| [**index.html**](index.html) | The page template, in the org house style with the source bar on top. `build.ts` fills in the data placeholder. |
| [**favicon.svg**](favicon.svg) | The DiffCarve app icon. |

[`../.github/workflows/pages.yml`](../.github/workflows/pages.yml) builds the page on every PR and
deploys it with `actions/deploy-pages` on every push to `main`. `#<sample id>` in the URL opens
that sample (`#checkout`).

---

<p align="center">
  <a href="../README.md">← Repository home</a>
</p>
