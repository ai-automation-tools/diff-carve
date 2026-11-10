import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { action } from "../src/action.ts";
import { fixtureRepo } from "./fixture.ts";

// A three-layer import chain, a doc outside the graph, and a deleted file.
const repo = fixtureRepo(
  {
    big: {
      "src/schema.ts": "export type T = number;\n",
      "src/data.ts": 'import type { T } from "./schema.ts";\nexport const get = (): T => 1;\n',
      "src/ui.ts": 'import { get } from "./data.ts";\nexport const show = () => get();\n',
      "docs/a.md": "one\n",
    },
    flat: { "src/a.ts": "export const a = 1;\n", "src/b.ts": "export const b = 2;\n" },
  },
  { "src/old.ts": "export const old = 0;\n" },
);
const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd: repo, encoding: "utf8" }).trim();
git("checkout", "-q", "big");
git("rm", "-q", "src/old.ts");
git("commit", "-q", "-m", "drop old");
test.after(() => rmSync(repo, { recursive: true, force: true }));

type Call = { path: string; method: string; body?: Record<string, unknown>; headers: Record<string, string> };

// Runs the Action with dry-run off against a fake GitHub API that answers the Git Data, Pulls and Stacks calls.
async function carve(head: string, opts: { dryRun?: string; carved?: boolean; failOn?: string; status?: number } = {}) {
  const event = join(repo, ".git", "event.json");
  const pr = { number: 7, title: "Big change", head: { sha: git("rev-parse", head), ref: head }, base: { sha: git("rev-parse", "main"), ref: "main" } };
  writeFileSync(event, JSON.stringify({ pull_request: pr }));
  const calls: Call[] = [];
  let n = 0;
  const http = (async (url: string, init: RequestInit) => {
    const path = url.replace("https://api.test/repos/o/r", "");
    const method = init.method ?? "GET";
    calls.push({ path, method, body: init.body ? JSON.parse(init.body as string) : undefined, headers: init.headers as Record<string, string> });
    if (opts.failOn && path.startsWith(opts.failOn)) return new Response("nope", { status: opts.status ?? 500 });
    if (path.startsWith("/git/ref/")) return new Response("{}", { status: opts.carved ? 200 : 404 });
    n++;
    const reply = path === "/pulls" ? { number: 100 + n } : method === "GET" ? [] : { sha: `sha${n}` };
    return new Response(JSON.stringify(reply), { status: 201 });
  }) as typeof fetch;
  let log = "";
  const env = {
    GITHUB_EVENT_PATH: event,
    GITHUB_WORKSPACE: repo,
    GITHUB_REPOSITORY: "o/r",
    GITHUB_API_URL: "https://api.test",
    GITHUB_TOKEN: "t",
    DIFFCARVE_THRESHOLD: "0",
    DIFFCARVE_DRY_RUN: opts.dryRun ?? "false",
  };
  const code = await action(env, (s) => (log += s), http);
  return { code, log, calls };
}

test("with dry-run off, each layer becomes a branch and a PR on the one below, joined into one stack", async () => {
  const r = await carve("big");
  assert.equal(r.code, 0, r.log);
  const trees = r.calls.filter((c) => c.path === "/git/trees").map((c) => c.body!);
  assert.equal(trees[0].base_tree, git("rev-parse", "main^{tree}"));
  assert.deepEqual(trees.map((t) => (t.tree as { path: string }[]).map((e) => e.path)), [
    ["src/schema.ts"],
    ["src/data.ts"],
    ["src/ui.ts", "docs/a.md", "src/old.ts"],
  ]);
  // Blobs come from the head commit; a deleted file gets a null sha.
  const top = trees[2].tree as { path: string; sha: string | null; mode: string }[];
  assert.equal(top[0].sha, git("rev-parse", "big:src/ui.ts"));
  assert.deepEqual(top[2], { path: "src/old.ts", mode: "100644", type: "blob", sha: null });
  // Each commit sits on the one below, starting at the merge base.
  const commits = r.calls.filter((c) => c.path === "/git/commits").map((c) => c.body!);
  assert.deepEqual(commits.map((c) => c.parents), [[git("merge-base", "main", "big")], ["sha2"], ["sha6"]]);
  const pulls = r.calls.filter((c) => c.path === "/pulls").map((c) => c.body!);
  assert.deepEqual(pulls.map((p) => [p.head, p.base, p.title]), [
    ["diffcarve/7/layer-1", "main", "Big change (layer 1 of 3)"],
    ["diffcarve/7/layer-2", "diffcarve/7/layer-1", "Big change (layer 2 of 3)"],
    ["diffcarve/7/layer-3", "diffcarve/7/layer-2", "Big change (layer 3 of 3)"],
  ]);
  const stack = r.calls.find((c) => c.path === "/stacks")!;
  assert.deepEqual(stack.body, { pull_requests: [104, 108, 112] });
  assert.equal(stack.headers["x-github-api-version"], "2026-03-10");
  // The original PR keeps its comment, now naming the stack.
  const comment = r.calls.at(-1)!;
  assert.equal(comment.path, "/issues/7/comments");
  assert.match(comment.body!.body as string, /Opened as a GitHub stack, bottom first: #104 → #108 → #112\. This PR stays open/);
  assert.match(r.log, /opened 3 layer PRs as a stack: #104, #108, #112\.\n.*Posted the comment/);
});

test("a PR already carved is left alone, with no write call", async () => {
  const r = await carve("big", { carved: true });
  assert.equal(r.code, 0);
  assert.deepEqual(r.calls.map((c) => `${c.method} ${c.path}`), ["GET /git/ref/heads/diffcarve/7/layer-1"]);
  assert.match(r.log, /carved into a stack on an earlier run\. Delete its diffcarve\/7\/ branches/);
});

test("a diff that is one layer opens no stack and still comments", async () => {
  const r = await carve("flat");
  assert.equal(r.code, 0);
  assert.ok(!r.calls.some((c) => c.path.startsWith("/git") || c.path === "/stacks"));
  assert.match(r.log, /everything lands in one layer, so there is no stack to open\./);
});

test("a token without contents: write warns without failing; other errors and a bad dry-run fail the step", async () => {
  const denied = await carve("big", { failOn: "/git/trees", status: 403 });
  assert.equal(denied.code, 0);
  assert.match(denied.log, /no permission to build layer 1 of 3's tree \(403\)\. Grant contents: write and pull-requests: write/);
  const broken = await carve("big", { failOn: "/stacks", status: 422 });
  assert.equal(broken.code, 1);
  assert.match(broken.log, /could not join PRs #104, #108, #112 into a stack: 422 nope/);
  const bad = await carve("big", { dryRun: "no" });
  assert.equal(bad.code, 1);
  assert.deepEqual(bad.calls, []);
  assert.match(bad.log, /dry-run must be true or false, got "no"/);
});

test("dry-run on (the default) never touches git refs, PRs or stacks", async () => {
  const r = await carve("big", { dryRun: "" });
  assert.deepEqual(r.calls.map((c) => `${c.method} ${c.path}`), ["GET /issues/7/comments?per_page=100&page=1", "POST /issues/7/comments"]);
  assert.match(r.log, /Posted the dry-run comment/);
});
