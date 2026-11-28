# Upstreams

Every external service, tool, and platform DiffCarve depends on, what the code assumes about
each, and where to check whether that assumption still holds. The biweekly **Diff-Carve
Upstream Check** routine (`upstream/auto-*` PRs) works from this file. Keep it current by hand
too: a new outbound call or dependency is a new row.

DiffCarve is a local CLI and a composite GitHub Action. It has no backend and, by ADR-001,
sends no diff content to any external service. Its only outbound call is the GitHub REST API
from the Action.

**Last checked** is filled in by the routine, and only with a date it actually read the
source. `—` means never checked.

## Platform and tools

| Upstream | What the code assumes | Code | Check at | Last checked |
|:---|:---|:---|:---|:---|
| **GitHub REST API (issues comments)** | The Action posts and updates one PR comment through `{GITHUB_API_URL or https://api.github.com}/repos/{GITHUB_REPOSITORY}/issues`, with `Authorization: Bearer <token>`, `Accept: application/vnd.github+json` and a `User-Agent`. The default token needs `pull-requests: write` | `src/action.ts` | docs.github.com/en/rest/issues/comments; docs.github.com/en/rest/overview/api-versions | 2026-11-23 |
| **GitHub REST API (Stacks and Git Data)** | When `dry-run` is false the Action builds one branch per layer through `/git/ref`, `/git/trees`, `/git/commits` and `/git/refs`, opens each layer with `POST /pulls`, then joins them with `POST /stacks` (`{"pull_requests": [...]}`) sent with `X-GitHub-Api-Version: 2026-03-10`. The Stacks API is public preview. Needs `contents: write` | `src/stack.ts` | docs.github.com/en/rest/pulls/stacks; docs.github.com/en/rest/overview/api-versions | 2026-11-23 |
| **GitHub Actions runtime** | `action.yml` is a composite action (`using: composite`) that reads the event payload at `GITHUB_EVENT_PATH` (`pull_request.head.sha`, `base.sha`, `head.ref`) and uses `GITHUB_WORKSPACE`, `GITHUB_ACTION_PATH`, `GITHUB_REPOSITORY`, `GITHUB_API_URL`. Inputs `threshold` and `token`; branding icon `scissors`, colour `orange` | `action.yml`, `src/action.ts`, `src/action-main.ts` | docs.github.com/en/actions/sharing-automations/creating-actions/creating-a-composite-action; docs.github.com/en/actions/reference/workflows-and-actions/variables | 2026-11-23 |
| **Pinned GitHub Actions** | `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-pages-artifact@v5` and `actions/deploy-pages@v5` in the workflows, and `setup-node@v7` in `action.yml`, all on `node24`. Breaking changes since v4 that don't bite here: checkout v7 refuses fork-PR checkouts under `pull_request_target` and `workflow_run` (the workflows use `pull_request` and `push`); setup-node v5 caches automatically when `package.json` has a `packageManager` field (it has none; CI sets `cache: npm`); upload-pages-artifact v4 drops dotfiles (`_site/` has none) | `.github/workflows/ci.yml`, `.github/workflows/diffcarve.yml`, `.github/workflows/pages.yml`, `action.yml` | github.com/actions/setup-node/releases; github.com/actions/checkout/releases; github.com/actions/deploy-pages/releases; github.com/actions/upload-pages-artifact/releases | 2026-11-23 |
| **git CLI** | `analyze` shells out to `git` with `execFileSync` to diff `branch` against its merge base with `base`. Needs `git` on `PATH` and a checkout with both refs fetched | `src/analyze.ts` | git-scm.com/docs; github.com/git/git/tags | 2026-11-23 |
| **Node.js** | `engines.node: ">=22.18"`: relies on Node stripping TypeScript types by default (the Action runs `src/action-main.ts` directly) and on `node --test`. CI and the Action pin Node 22 | `package.json`, `.github/workflows/ci.yml`, `action.yml`, `src/action-main.ts` | nodejs.org/en/about/previous-releases; raw.githubusercontent.com/nodejs/Release/main/schedule.json | 2026-11-23 |

## Libraries and language

| Upstream | What the code assumes | Code | Check at | Last checked |
|:---|:---|:---|:---|:---|
| **ts-morph** (`^28.0.0`) | `Project`, `ts` re-export, and the TypeScript compiler API it bundles: `ts.resolveModuleName`, `ts.ModuleResolutionKind.Bundler`, `ts.JsxEmit.Preserve`. Builds the import graph for TS/JS (ADR-001) | `src/analyze.ts` | github.com/dsherret/ts-morph/releases | 2026-11-23 |
| **TypeScript** (`~6.0`, dev) | Pinned to `~6.0` because `typescript-eslint` does not support 7.x yet. `erasableSyntaxOnly` and `rewriteRelativeImportExtensions` are on | `package.json`, `tsconfig.json`, `tsconfig.build.json` | devblogs.microsoft.com/typescript; github.com/typescript-eslint/typescript-eslint/releases (supported TypeScript range; 8.73.0 still caps it at <6.1.0) | 2026-11-23 |
| **ESLint 10 and typescript-eslint** (dev) | Flat config, `@eslint/js` recommended and `typescript-eslint` recommended, on `eslint` and `@eslint/js` `^10` since 2026-11-23. typescript-eslint 8.72.2 declares ESLint `^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0` and TypeScript `<6.1.0` as peers | `eslint.config.js`, `package.json` | eslint.org/blog; typescript-eslint.io/blog | 2026-11-09 |

Flag breaking majors, EOL runtimes, and security advisories only. Routine bumps are
Dependabot's job.
