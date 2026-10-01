# Open questions

Decisions only Mike can make. The roadmap agent asks here; an entry with a filled
`- Answer:` line gets applied on the next run and moves to Answered.

## Open

### Fix path-alias resolution and re-run the spike before signing it off?
- Asked: 2026-09-30 by diff-carve-roadmap
- Context: The spike ([SPIKE_RESULTS.md](SPIKE_RESULTS.md)) proposes 6 of 10 sensible, one short of the 7-of-10 bar. Three of the four misses (#5, #9, #10) come from one known gap: the analyzer resolves relative imports only, and those repos import through tsconfig `paths` (`@/...`) or package.json `imports` (`#app/...`). The spike gate means no run may touch the analyzer until you sign off. Options: (a) sign off on the current results as they stand; (b) let the next run teach the resolver tsconfig `paths` and package.json `imports` (a few dozen lines with ts-morph, no new dependency), re-run the same ten PRs, and update SPIKE_RESULTS.md before you judge; (c) judge now and re-run later anyway. Recommendation: (b). Aliases are how most Next.js and Vite apps import, so a verdict that counts them as failures measures the shortcut, not the approach. The Battleship miss (disconnected subgraphs interleaved) is a separate layering question for Slice 1.
- Answer:

## Answered
