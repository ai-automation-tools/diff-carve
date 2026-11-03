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
| **GitHub REST API (issues comments)** | The Action posts and updates one PR comment through `{GITHUB_API_URL or https://api.github.com}/repos/{GITHUB_REPOSITORY}/issues`, with `Authorization: Bearer <token>`, `Accept: application/vnd.github+json` and a `User-Agent`. The default token needs `pull-requests: write` | `src/action.ts` | docs.github.com/en/rest/issues/comments; docs.github.com/en/rest/overview/api-versions | — |
| **GitHub Actions runtime** | `action.yml` is a composite action (`using: composite`) that reads the event payload at `GITHUB_EVENT_PATH` (`pull_request.head.sha`, `base.sha`, `head.ref`) and uses `GITHUB_WORKSPACE`, `GITHUB_ACTION_PATH`, `GITHUB_REPOSITORY`, `GITHUB_API_URL`. Inputs `threshold` and `token`; branding icon `scissors`, colour `orange` | `action.yml`, `src/action.ts`, `src/action-main.ts` | docs.github.com/en/actions/sharing-automations/creating-actions/creating-a-composite-action; docs.github.com/en/actions/reference/workflows-and-actions/variables | — |
| **Pinned GitHub Actions** | `actions/checkout@v4` and `actions/setup-node@v4` in the workflows and in `action.yml` | `.github/workflows/ci.yml`, `.github/workflows/diffcarve.yml`, `action.yml` | github.com/actions/setup-node/releases; github.com/actions/checkout/releases | — |
| **git CLI** | `analyze` shells out to `git` with `execFileSync` to diff `branch` against its merge base with `base`. Needs `git` on `PATH` and a checkout with both refs fetched | `src/analyze.ts` | git-scm.com/docs; github.com/git/git/tags | — |
| **Node.js** | `engines.node: ">=22.18"`: relies on Node stripping TypeScript types by default (the Action runs `src/action-main.ts` directly) and on `node --test`. CI and the Action pin Node 22 | `package.json`, `.github/workflows/ci.yml`, `action.yml`, `src/action-main.ts` | nodejs.org/en/about/previous-releases; raw.githubusercontent.com/nodejs/Release/main/schedule.json | — |

## Libraries and language

| Upstream | What the code assumes | Code | Check at | Last checked |
|:---|:---|:---|:---|:---|
| **ts-morph** (`^28.0.0`) | `Project`, `ts` re-export, and the TypeScript compiler API it bundles: `ts.resolveModuleName`, `ts.ModuleResolutionKind.Bundler`, `ts.JsxEmit.Preserve`. Builds the import graph for TS/JS (ADR-001) | `src/analyze.ts` | github.com/dsherret/ts-morph/releases | — |
| **TypeScript** (`~6.0`, dev) | Pinned to `~6.0` because `typescript-eslint` does not support 7.x yet. `erasableSyntaxOnly` and `rewriteRelativeImportExtensions` are on | `package.json`, `tsconfig.json`, `tsconfig.build.json` | devblogs.microsoft.com/typescript; github.com/typescript-eslint/typescript-eslint/releases (supported TypeScript range) | — |
| **ESLint 9 and typescript-eslint** (dev) | Flat config, `@eslint/js` recommended and `typescript-eslint` recommended | `eslint.config.js`, `package.json` | eslint.org/blog; typescript-eslint.io/blog | — |

Flag breaking majors, EOL runtimes, and security advisories only. Routine bumps are
Dependabot's job.
