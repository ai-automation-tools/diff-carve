# Open questions

Decisions only the owner can make. The roadmap agent asks here; an entry with a filled
`- Answer:` line gets applied on the next run and moves to Answered.

## Open

### PR #13 holds the demo go-live and Slice 2: merge both, or split Slice 2 out first?
- Asked: 2026-11-02 by diff-carve-roadmap
- Context: PR #13 (`roadmap/auto-2026-10-28`) is held for two reasons: `.github/workflows/pages.yml` publishes the demo on merge, which is your go-live call, and the PR now carries a second feature, Slice 2 (`diffcarve.yml`). Append-mode runs add to this PR and can't rewrite it, so every new feature would land on a PR that's already held. Because of that, the 2026-11-02 run built nothing. Options: (a) merge #13 as is, so the demo goes live and Slice 2 ships with it; (b) let the next run cherry-pick `dde4ddd` (Slice 2) onto a fresh branch from `main` as its own PR, while #13 waits for the go-live call (#13 would still contain Slice 2 until the split PR merges first); (c) leave #13 held and let runs keep appending (Slice 4 next). Recommendation: (a) if you're happy for the demo to be live while the repo is private (its View source link 404s until graduation), otherwise (b). Until you answer, runs leave #13 alone and add no features to it. Also outside this repo: the runner's `holdPaths` for diff-carve should list `.github/workflows/pages.yml`.
- Answer:

## Answered

### Where does path-alias resolution go on the roadmap, now that Slice 1's score is in?
- Asked: 2026-10-14 by diff-carve-roadmap
- Context: Your 2026-10-12 answer said alias resolution can be picked up as normal roadmap work, but the roadmap has no item for it. Slice 1's score agrees with the spike verdicts on 6 of 10 ([SPIKE_RESULTS.md](SPIKE_RESULTS.md#slice-1-does-the-score-agree-with-the-verdicts)): three disagreements are sensible stacks with one oversized layer (the score doing its job), and one is #5, where an unresolved `#app/...` alias leaves a bad order the score can't see. Options: (a) add "Resolve tsconfig `paths` and package.json `imports`, re-run the spike" as a Build item right after Slice 1, so the next run does it before Slice 2; (b) add it after Slice 3, still a release gate; (c) put it under Fast-follow slices, after public release. Recommendation: (a). It's a few dozen lines with ts-morph and no new dependency, it flips three of the four misses, and every later slice (config, Action, demo) shows its output on real repos, most of which import through aliases. Until you answer, the next run takes Slice 2 as the roadmap stands.
- Answer: (a) Add "Resolve tsconfig `paths` and package.json `imports`, re-run the spike" as a Build item right after Slice 1. (Mike, 2026-10-19)
- Applied: 2026-10-21 by diff-carve-roadmap

### Fix path-alias resolution and re-run the spike before signing it off?
- Asked: 2026-09-30 by diff-carve-roadmap
- Context: The spike ([SPIKE_RESULTS.md](SPIKE_RESULTS.md)) proposes 6 of 10 sensible, one short of the 7-of-10 bar. Three of the four misses (#5, #9, #10) come from one known gap: the analyzer resolves relative imports only, and those repos import through tsconfig `paths` (`@/...`) or package.json `imports` (`#app/...`). The spike gate means no run may touch the analyzer until you sign off. Options: (a) sign off on the current results as they stand; (b) let the next run teach the resolver tsconfig `paths` and package.json `imports` (a few dozen lines with ts-morph, no new dependency), re-run the same ten PRs, and update SPIKE_RESULTS.md before you judge; (c) judge now and re-run later anyway. Recommendation: (b). Aliases are how most Next.js and Vite apps import, so a verdict that counts them as failures measures the shortcut, not the approach. The Battleship miss (disconnected subgraphs interleaved) is a separate layering question for Slice 1.
- Answer: (a) Sign off on the spike results as they stand (6 of 10). The spike gate is lifted; path-alias resolution can be picked up as normal roadmap work. (Mike, 2026-10-12)
- Applied: 2026-10-14 by diff-carve-roadmap
