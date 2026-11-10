import { execFileSync } from "node:child_process";
import type { Analysis } from "./analyze.ts";

// One GitHub REST call: a path under /repos/{owner}/{repo}, a method and an optional JSON body.
export type Call = (path: string, method?: string, body?: unknown, headers?: Record<string, string>) => Promise<Response>;
export type Pr = { number: number; title?: string; base: { sha: string; ref?: string }; head: { sha: string; ref: string } };
export type Stacked = { prs: number[] } | { res: Response; what: string };

// The Stacks API's version (https://docs.github.com/en/rest/pulls/stacks, public preview).
const STACKS_VERSION = { "x-github-api-version": "2026-03-10" };

export const branchFor = (pr: number, layer: number) => `diffcarve/${pr}/layer-${layer}`;

// The layers a stack opens: the analysis's layers, with the files outside the import graph
// (deleted, excluded, not TS/JS) riding in the top one, where nothing above can miss them.
export function stackLayers(a: Analysis): string[][] {
  const layers = a.layers.map((l) => [...l]);
  if (a.outside.length) (layers.at(-1) ?? (layers[0] = [])).push(...a.outside);
  return layers;
}

// Opens each layer as a branch and a PR based on the one below it, then joins the PRs into one
// GitHub stack. Layer i's branch is the merge base plus layers 1..i as they are at the PR head,
// built through the Git Data API from blobs the head commit already pushed, so the last branch
// matches the PR. Carves once: if layer 1's branch exists, returns no PRs and touches nothing.
// The original PR stays open; nothing is merged, closed or approved.
export async function openStack(cwd: string, a: Analysis, pr: Pr, call: Call): Promise<Stacked> {
  const git = (args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
  const found = await call(`/git/ref/heads/${branchFor(pr.number, 1)}`);
  if (found.ok) return { prs: [] };
  if (found.status !== 404) return { res: found, what: "look for an earlier stack" };

  const blobs = new Map<string, { mode: string; type: string; sha: string }>();
  for (const row of git(["ls-tree", "-r", "-z", pr.head.sha]).split("\0")) {
    const [meta, path] = row.split("\t");
    const [mode, type, sha] = meta.split(" ");
    if (path) blobs.set(path, { mode, type, sha });
  }
  const layers = stackLayers(a);
  let tree = git(["rev-parse", `${a.mergeBase}^{tree}`]).trim();
  let parent = a.mergeBase;
  let base = pr.base.ref ?? "main";
  const prs: number[] = [];
  for (const [i, files] of layers.entries()) {
    const n = `${i + 1} of ${layers.length}`;
    // A file missing at the head was deleted: a null sha removes it from the tree.
    const entries = files.map((path) => ({ path, mode: "100644", type: "blob", sha: null, ...blobs.get(path) }));
    let res = await call("/git/trees", "POST", { base_tree: tree, tree: entries });
    if (!res.ok) return { res, what: `build layer ${n}'s tree` };
    tree = ((await res.json()) as { sha: string }).sha;
    res = await call("/git/commits", "POST", { message: `Layer ${n} of #${pr.number}, carved by DiffCarve`, tree, parents: [parent] });
    if (!res.ok) return { res, what: `commit layer ${n}` };
    parent = ((await res.json()) as { sha: string }).sha;
    const head = branchFor(pr.number, i + 1);
    res = await call("/git/refs", "POST", { ref: `refs/heads/${head}`, sha: parent });
    if (!res.ok) return { res, what: `create branch ${head}` };
    const body = `Layer ${n} carved from #${pr.number} by DiffCarve, in dependency order: nothing here imports from a later layer.\n\n${files.map((f) => `- \`${f}\``).join("\n")}\n`;
    res = await call("/pulls", "POST", { title: `${pr.title ?? `#${pr.number}`} (layer ${n})`, head, base, body });
    if (!res.ok) return { res, what: `open layer ${n}'s PR` };
    prs.push(((await res.json()) as { number: number }).number);
    base = head;
  }
  const res = await call("/stacks", "POST", { pull_requests: prs }, STACKS_VERSION);
  if (!res.ok) return { res, what: `join PRs ${prs.map((p) => `#${p}`).join(", ")} into a stack` };
  return { prs };
}
