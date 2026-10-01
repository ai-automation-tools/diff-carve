<h1 align="center">🔬 DiffCarve Spike Results</h1>

<p align="center">
  <em>Ten real, oversized, AI-written pull requests run through <code>diffcarve analyze</code>, and whether the layers it found make sense.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/verdict-awaiting_Mike-F59E0B?style=for-the-badge" alt="Verdict: awaiting Mike">
  <a href="ROADMAP.md"><img src="https://img.shields.io/badge/plan-ROADMAP-8B5CF6?style=for-the-badge" alt="Roadmap"></a>
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs-6B7280?style=for-the-badge" alt="Docs home"></a>
</p>

---

This is roadmap item *Slice 0b*. The spec's bar: at least 7 of 10 layer breakdowns judged
sensible, meaning files grouped by real dependency, not by line count. At 5 or fewer, the
decision memo's falsifier fires and DiffCarve gets parked.

The verdicts below are **proposals** written by the roadmap agent on 2026-09-30. The real
verdict is Mike's: fill in the *Mike* column, then tick the sign-off item in the
[roadmap](ROADMAP.md).

## Summary

**Proposed: 6 of 10 sensible.** That's under the 7-of-10 bar and over the falsifier's 5.
Three of the four misses have one cause, unresolved path aliases (see
[What the misses have in common](#what-the-misses-have-in-common)).

| # | PR | Lines | Files | Layers | Time | Proposed | Mike |
|:--|:---|--:|--:|--:|--:|:--|:--|
| 1 | [microsoft/vscode#338333](https://github.com/microsoft/vscode/pull/338333) | 740 | 17 | 4 | 2.29s | Sensible |  |
| 2 | [microsoft/vscode#336254](https://github.com/microsoft/vscode/pull/336254) | 614 | 13 | 4 | 1.32s | Sensible |  |
| 3 | [github/gh-aw-firewall#9303](https://github.com/github/gh-aw-firewall/pull/9303) | 732 | 27 | 7 | 1.64s | Sensible |  |
| 4 | [github/gh-aw-firewall#9220](https://github.com/github/gh-aw-firewall/pull/9220) | 669 | 12 | 3 | 1.25s | Sensible |  |
| 5 | [kentcdodds/mediarss#128](https://github.com/kentcdodds/mediarss/pull/128) | 534 | 7 | 2 | 1.02s | Arbitrary |  |
| 6 | [Azure/Azurite#2740](https://github.com/Azure/Azurite/pull/2740) | 461 | 7 | 2 | 0.86s | Sensible |  |
| 7 | [daraskme/Nextcloud-flare#25](https://github.com/daraskme/Nextcloud-flare/pull/25) | 2338 | 21 | 7 | 1.46s | Sensible |  |
| 8 | [lalligood10/Battleship#28](https://github.com/lalligood10/Battleship/pull/28) | 1268 | 26 | 6 | 1.90s | Arbitrary |  |
| 9 | [anishthite/devin-takehome#4](https://github.com/anishthite/devin-takehome/pull/4) | 2549 | 36 | 6 | 2.24s | Arbitrary |  |
| 10 | [xpadev-net/video-host#60](https://github.com/xpadev-net/video-host/pull/60) | 1270 | 16 | 2 | 1.38s | Arbitrary |  |

Every PR was opened by an AI coding agent (GitHub Copilot's coding agent for the
Microsoft, GitHub and Azure repos, Devin for the rest), merged, public, and over 400
changed lines. The slowest analysis took 2.3 seconds, well inside the 60-second budget.

## How it was run

1. Candidates came from `gh search prs --author app/copilot-swe-agent` and
   `--author app/devin-ai-integration`, merged, TypeScript. The ten keep at least five
   changed TS/JS files each and spread across eight repos.
2. For each PR, the changed files at the merge base and at the PR head were fetched
   through the GitHub contents API and committed into a scratch repo as two commits:
   merge base on `main`, PR head on `pr`. The analyzer only ever reads the changed files,
   so this gives the same graph as a full clone without pulling all of vscode.
3. From `main` in that scratch repo: `node src/cli.ts analyze pr`, the real CLI at commit
   `6cd7baf`. Times are the CLI's own "Analyzed in" line, on a Windows 11 laptop.

Nothing from those repos is vendored here. The file lists below are paths only.

## What the misses have in common

- **Path aliases (3 PRs: 5, 9, 10).** The analyzer resolves relative imports only, a
  shortcut Slice 0a flagged. These repos import through tsconfig `paths` (`@/lib/...`) or
  package.json `imports` (`#app/...`), so edges are missing and files that depend on each
  other share a layer. In #10 nearly the whole diff collapses into one layer. This is a
  resolver gap, not a flaw in layering by import graph: the parts of #9 reached through
  relative imports are ordered well.
- **Disconnected subgraphs share layers (1 PR: 8).** Layers come from import depth alone,
  so a PR that touches a backend and a frontend with no imports between them gets both
  sides interleaved, layer by layer. Splitting unconnected components into separate stacks
  before layering would fix this.
- **Thin layers (not a miss, worth noting for Slice 1).** #3 and #7 each run to 7 layers,
  some holding one file. Correct order, but more PRs than a reviewer wants. The score and
  line budget in Slice 1 are the natural place to merge small adjacent layers.
- **Tests that import nothing else in the diff** land in layer 1 (#1, #4, #7). Harmless,
  but they read oddly next to the foundation code.

If the alias resolver is fixed and the spike re-run, #5, #9 and #10 are likely to flip,
which would put the count at 8 or 9. Whether to do that before sign-off is an open
question in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md).

## Layer breakdowns

### 1. [microsoft/vscode#338333](https://github.com/microsoft/vscode/pull/338333)

740 changed lines, 17 files, 4 layers, analyzed in 2.29s.

- **Layer 1:** `src/vs/platform/agentHost/common/meta/agentCompletionAttachmentMeta.ts`, `src/vs/platform/agentHost/node/agentHostCompletions.ts`, `src/vs/platform/agentHost/test/node/e2e/suites/hostFeaturesSuite.ts`, `src/vs/workbench/contrib/chat/browser/widget/input/editor/chatInputCompletionUtils.ts`, `src/vs/workbench/contrib/chat/common/chatSessionsService.ts`
- **Layer 2:** `src/vs/platform/agentHost/node/copilot/copilotSlashCommandCompletionProvider.ts`, `src/vs/sessions/contrib/chat/browser/agentHostInputCompletions.ts`, `src/vs/workbench/contrib/chat/browser/agentSessions/agentHost/agentHostSessionHandler.ts`, `src/vs/workbench/contrib/chat/browser/widget/input/editor/agentHostInputCompletions.ts`, `src/vs/workbench/contrib/chat/test/browser/agentSessions/agentHostChatContribution.test.ts`
- **Layer 3:** `src/vs/platform/agentHost/node/copilot/copilotAgent.ts`, `src/vs/platform/agentHost/test/node/copilotSlashCommandCompletionProvider.test.ts`, `src/vs/sessions/contrib/chat/browser/newChatInput.ts`, `src/vs/sessions/contrib/chat/test/browser/newChatInputPaste.test.ts`, `src/vs/workbench/contrib/chat/test/browser/widget/input/editor/chatInputCompletions.test.ts`
- **Layer 4:** `src/vs/platform/agentHost/node/agentHostMain.ts`, `src/vs/platform/agentHost/test/node/copilotAgent.test.ts`

**Proposed verdict: Sensible.** Shared completion metadata and the sessions service come first, the providers that use them next, then the Copilot agent, then the host entry point. Only the e2e suite in layer 1 is out of place (it imports nothing else in the diff).

### 2. [microsoft/vscode#336254](https://github.com/microsoft/vscode/pull/336254)

614 changed lines, 13 files, 4 layers, analyzed in 1.32s.

- **Layer 1:** `src/vs/platform/agentHost/common/meta/agentPullRequestOperationMeta.ts`, `src/vs/sessions/contrib/changes/browser/sessionsChangesAccessibilityHelp.ts`, `src/vs/sessions/contrib/changes/common/pullRequestCreation.ts`
- **Layer 2:** `src/vs/platform/agentHost/node/chatContributions/pullRequest/pullRequestChatContribution.ts`, `src/vs/platform/agentHost/test/common/agentPullRequestOperationMeta.test.ts`, `src/vs/sessions/contrib/changes/browser/createPullRequestChatRequest.ts`, `src/vs/sessions/contrib/changes/browser/createPullRequestWidget.ts`, `src/vs/sessions/contrib/providers/agentHost/browser/agentHostPullRequestCreation.ts`
- **Layer 3:** `src/vs/platform/agentHost/test/node/pullRequestChatContribution.test.ts`, `src/vs/sessions/contrib/changes/browser/createPullRequestContextView.ts`, `src/vs/sessions/contrib/changes/test/browser/createPullRequestChatRequest.test.ts`, `src/vs/sessions/contrib/providers/agentHost/test/browser/agentHostPullRequestCreation.test.ts`
- **Layer 4:** `src/vs/sessions/contrib/changes/test/browser/createPullRequestWidget.test.ts`

**Proposed verdict: Sensible.** The PR-creation model and operation metadata land before the widget, chat request and contribution that use them; views and tests follow.

### 3. [github/gh-aw-firewall#9303](https://github.com/github/gh-aw-firewall/pull/9303)

732 changed lines, 27 files, 7 layers, analyzed in 1.64s.

- **Layer 1:** `src/cloud-hypervisor/network-namespace.ts`, `src/cloud-hypervisor/vmm-identity.ts`
- **Layer 2:** `src/cloud-hypervisor/cleanup-handle.ts`, `src/cloud-hypervisor/cleanup-identity.ts`, `src/cloud-hypervisor/cleanup-network.ts`, `src/cloud-hypervisor/cleanup-registry.ts`, `src/cloud-hypervisor/manager-types.ts`, `src/cloud-hypervisor/network-namespace.test.ts`, `src/cloud-hypervisor/vmm-identity.test.ts`
- **Layer 3:** `src/cloud-hypervisor/cleanup-registry.test.ts`, `src/cloud-hypervisor/diagnostics.ts`, `src/cloud-hypervisor/manager-stop.ts`, `src/cloud-hypervisor/vm-config-builder.ts`, `src/cloud-hypervisor/workload-profile.ts`
- **Layer 4:** `src/cloud-hypervisor/manager-start.ts`, `src/cloud-hypervisor/workload-profile.test.ts`
- **Layer 5:** `src/cloud-hypervisor/manager.ts`
- **Layer 6:** `src/cloud-hypervisor/manager.test-utils.ts`
- **Layer 7:** `src/cloud-hypervisor/manager-launch.test.ts`, `src/cloud-hypervisor/vm-config-builder.test.ts`
- **Outside the graph:** `docs/adr/0002-cloud-hypervisor-enclave-executor.md`, `docs/cloud-hypervisor-foundation.md`, `docs/enclaves-architecture.md`, `guest/microvm-supervisor/config.go`, `guest/microvm-supervisor/config_test.go`, `guest/microvm-supervisor/runtime_linux.go`, `guest/microvm-supervisor/runtime_linux_test.go`

**Proposed verdict: Sensible.** Identity and namespace primitives, then the cleanup registry, then the manager pieces, the manager, its test utilities and tests. Thin: 7 layers for 27 files, two of them single-file, and a 5-file import cycle forms most of layer 2.

### 4. [github/gh-aw-firewall#9220](https://github.com/github/gh-aw-firewall/pull/9220)

669 changed lines, 12 files, 3 layers, analyzed in 1.25s.

- **Layer 1:** `src/cloud-hypervisor-runtime-backend.test.ts`, `src/sensitive-path-audit.ts`, `src/sensitive-paths.ts`
- **Layer 2:** `src/cloud-hypervisor/filesystem-write-enforcement.ts`, `src/config-writer.ts`, `src/sensitive-paths.test.ts`, `src/services/agent-security-config.test.ts`, `src/services/agent-service.ts`, `src/services/agent-volumes-security.test.ts`
- **Layer 3:** `src/cloud-hypervisor/filesystem-write-enforcement.test.ts`, `src/cloud-hypervisor/runtime-boot-loop.ts`, `src/config-writer.test.ts`

**Proposed verdict: Sensible.** The new `sensitive-paths` module first, its consumers next, their dependents and tests last. A test that imports nothing else in the diff sits in layer 1.

### 5. [kentcdodds/mediarss#128](https://github.com/kentcdodds/mediarss/pull/128)

534 changed lines, 7 files, 2 layers, analyzed in 1.02s.

- **Layer 1:** `app/client/admin/media-detail.tsx`, `app/helpers/description-html.ts`, `app/routes/admin/api/media.$path.metadata.ts`, `app/routes/admin/api/media.$path.ts`
- **Layer 2:** `app/helpers/description-html.test.ts`
- **Outside the graph:** `package-lock.json`, `package.json`

**Proposed verdict: Arbitrary.** The repo imports through `#app/...` (package.json `imports`), which the analyzer doesn't resolve, so the new `description-html` helper shares layer 1 with the two routes that import it.

### 6. [Azure/Azurite#2740](https://github.com/Azure/Azurite/pull/2740)

461 changed lines, 7 files, 2 layers, analyzed in 0.86s.

- **Layer 1:** `src/blob/authentication/BlobTokenAuthenticator.ts`, `src/queue/authentication/QueueTokenAuthenticator.ts`, `src/table/authentication/TableTokenAuthenticator.ts`
- **Layer 2:** `tests/blob/unit/BlobTokenAuthenticator.unit.test.ts`, `tests/queue/unit/QueueTokenAuthenticator.unit.test.ts`, `tests/table/unit/TableTokenAuthenticator.unit.test.ts`
- **Outside the graph:** `ChangeLog.md`

**Proposed verdict: Sensible.** Three authenticators, then their three unit tests. Correct, if shallow: the three source files don't depend on each other.

### 7. [daraskme/Nextcloud-flare#25](https://github.com/daraskme/Nextcloud-flare/pull/25)

2338 changed lines, 21 files, 7 layers, analyzed in 1.46s.

- **Layer 1:** `packages/worker/src/db/mutationAdmission.ts`, `packages/worker/test/integration/schema.test.ts`
- **Layer 2:** `packages/worker/src/db/permits.ts`
- **Layer 3:** `packages/worker/src/do/LockDO.ts`, `packages/worker/src/jobs/operations.ts`
- **Layer 4:** `packages/worker/src/jobs/treeJobStore.ts`
- **Layer 5:** `packages/worker/src/jobs/treeJobWorker.ts`, `packages/worker/src/services/purgeTrash.ts`, `packages/worker/src/services/restoreTrash.ts`, `packages/worker/src/services/trashNode.ts`, `packages/worker/test/unit/tree-job-store.test.ts`
- **Layer 6:** `packages/worker/src/api/nodeMutations.ts`, `packages/worker/src/jobs/deadLetter.ts`, `packages/worker/src/jobs/queue.ts`
- **Layer 7:** `packages/worker/src/index.ts`, `packages/worker/test/integration/async-tree.test.ts`
- **Outside the graph:** `docs/CURRENT_STATE.md`, `docs/HANDOFF.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/OUTBOX.md`, `packages/worker/migrations/0047_async_tree_jobs.sql`

**Proposed verdict: Sensible.** DB admission and permits, then lock and job operations, the job store, the trash services, the API and queue, and finally `index.ts` with the integration test. A clean bottom-up read, though three of the seven layers hold one or two files.

### 8. [lalligood10/Battleship#28](https://github.com/lalligood10/Battleship/pull/28)

1268 changed lines, 26 files, 6 layers, analyzed in 1.90s.

- **Layer 1:** `functions/src/lib/username.ts`, `functions/src/types.ts`, `functions/test/rules.test.ts`, `web/src/lib/sound.ts`, `web/src/lib/types.ts`
- **Layer 2:** `functions/src/lib/firestore.ts`, `functions/src/lib/username.test.ts`, `web/src/game/commentary.ts`, `web/src/lib/api.ts`, `web/src/state/SessionProvider.tsx`
- **Layer 3:** `functions/src/handlers/bots.ts`, `functions/src/handlers/games.ts`, `functions/src/handlers/users.ts`, `web/src/game/commentary.test.ts`, `web/src/lib/firestore.ts`, `web/src/pages/AdminPage.tsx`, `web/src/pages/game/ActiveGameView.tsx`
- **Layer 4:** `functions/src/handlers/admin.ts`, `web/src/components/GameChat.tsx`, `web/src/pages/ProfilePage.tsx`
- **Layer 5:** `functions/src/index.ts`, `functions/test/handlers.test.ts`, `web/src/pages/GamePage.tsx`
- **Layer 6:** `web/src/App.tsx`
- **Outside the graph:** `firestore.rules`, `web/src/index.css`

**Proposed verdict: Arbitrary.** The order is valid, but layering by import depth alone interleaves two unconnected subgraphs: Firebase `functions/` handlers and `web/` React pages share layers 2 to 5. A reviewer would want the backend and frontend as separate stacks.

### 9. [anishthite/devin-takehome#4](https://github.com/anishthite/devin-takehome/pull/4)

2549 changed lines, 36 files, 6 layers, analyzed in 2.24s.

- **Layer 1:** `next.config.ts`, `src/app/(app)/approvals/actions.ts`, `src/app/(app)/audit/page.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`, `src/app/forbidden.tsx`, `src/auth.ts`, `src/demo/personas.ts`, `src/lib/dataverse/types.ts`, `src/lib/kit/actor.ts`, `src/lib/kit/audit-log.ts`, `src/lib/kit/role-provider.ts`, `src/lib/kit/services.ts`
- **Layer 2:** `src/app/(app)/approvals/page.tsx`, `src/demo/audit-log.ts`, `src/lib/dataverse/client.ts`, `src/lib/kit/approvals.ts`, `src/lib/kit/audit-reader.ts`, `src/lib/kit/authz.ts`
- **Layer 3:** `src/demo/approvals.ts`, `src/lib/dataverse/approval-mirror.ts`, `src/lib/dataverse/audit-reader.ts`, `src/lib/dataverse/flow-approvals.ts`, `src/lib/dataverse/role-provider.ts`
- **Layer 4:** `src/demo/dataverse/org.ts`, `src/lib/dataverse/config.ts`
- **Layer 5:** `src/demo/dataverse/client.ts`, `src/lib/dataverse/http-client.ts`, `tests/dataverse-config.test.ts`
- **Layer 6:** `tests/approvals.test.ts`, `tests/audit.test.ts`, `tests/dataverse-client.test.ts`, `tests/role-provider.test.ts`
- **Outside the graph:** `.env.example`, `README.md`, `package.json`

**Proposed verdict: Arbitrary.** Most imports go through the `@/` tsconfig alias and aren't resolved, so pages like `(app)/page.tsx` and `audit/page.tsx` land in layer 1 next to the types they import. The `lib/` part reached through relative imports is ordered well.

### 10. [xpadev-net/video-host#60](https://github.com/xpadev-net/video-host/pull/60)

1270 changed lines, 16 files, 2 layers, analyzed in 1.38s.

- **Layer 1:** `app/backend/src/@types/models.ts`, `app/backend/src/lib/s3.ts`, `app/backend/src/routes/api/v4/movies/[movie].ts`, `app/backend/src/routes/api/v4/movies/index.ts`, `app/backend/src/routes/api/v4/series/[series].ts`, `app/backend/src/routes/api/v4/upload.ts`, `app/backend/src/utils/buildVisibilityFilter.ts`, `app/backend/src/utils/movieAuth.ts`, `app/frontend/src/hooks/useUpload.ts`, `app/frontend/src/pages/dashboard/videos/[id]/edit.tsx`, `app/frontend/src/pages/dashboard/videos/index.tsx`, `app/frontend/src/pages/dashboard/videos/new.tsx`
- **Layer 2:** `app/backend/src/__tests__/authorization.test.ts`
- **Outside the graph:** `app/backend/prisma/migrations/20261001023000_add_uploading_movie_status/migration.sql`, `app/backend/prisma/schema.prisma`, `app/frontend/tsconfig.json`

**Proposed verdict: Arbitrary.** Every cross-file import uses the `@/` alias, so 12 of 13 files collapse into one layer and only the test is split off. No real partition.

---

<p align="center">
  <a href="ROADMAP.md">← Roadmap</a> ·
  <a href="README.md">↑ Docs home</a>
</p>
