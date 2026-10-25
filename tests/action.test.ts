import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MARKER, action } from "../src/action.ts";
import { fixtureRepo } from "./fixture.ts";

const repo = fixtureRepo({
  // 8 lines changed across a three-file import chain.
  big: {
    "src/schema.ts": "export type T = number;\n",
    "src/data.ts": 'import type { T } from "./schema.ts";\nexport const get = (): T => 1;\n',
    "src/ui.ts": 'import { get } from "./data.ts";\nexport const show = () => get();\n',
    "docs/a.md": "one\ntwo\nthree\n",
  },
  single: { "src/one.ts": "export const one = 1;\n" },
  empty: {},
});
// HEAD sits on the PR branch, as on a runner's merge checkout, so the base has to come from the event.
execFileSync("git", ["checkout", "-q", "big"], { cwd: repo });
test.after(() => rmSync(repo, { recursive: true, force: true }));

const sha = (ref: string) => execFileSync("git", ["rev-parse", ref], { cwd: repo, encoding: "utf8" }).trim();

type Call = { url: string; method: string; body?: string };

// Runs the Action on a PR from `head` into main, against a fake GitHub API.
async function carve(head: string, opts: { threshold?: string; comments?: { id: number; body: string }[]; status?: number; event?: object } = {}) {
  const event = join(repo, ".git", "event.json");
  const pr = { number: 7, head: { sha: sha(head), ref: head }, base: { sha: sha("main") } };
  writeFileSync(event, JSON.stringify(opts.event ?? { pull_request: pr }));
  const calls: Call[] = [];
  const http = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method ?? "GET", body: init.body as string | undefined });
    const status = opts.status ?? 200;
    return new Response(JSON.stringify(init.method === "GET" ? (opts.comments ?? []) : {}), { status });
  }) as typeof fetch;
  let log = "";
  const env = {
    GITHUB_EVENT_PATH: event,
    GITHUB_WORKSPACE: repo,
    GITHUB_REPOSITORY: "o/r",
    GITHUB_API_URL: "https://api.test",
    GITHUB_TOKEN: "t",
    DIFFCARVE_THRESHOLD: opts.threshold,
  };
  const code = await action(env, (s) => (log += s), http);
  return { code, log, calls };
}

test("under the threshold the Action makes no API call and says why", async () => {
  const r = await carve("big");
  assert.equal(r.code, 0);
  assert.deepEqual(r.calls, []);
  assert.match(r.log, /8 lines changed, under the threshold of 400\. No comment\./);
});

test("over the threshold it posts one dry-run comment, diffed against the event's base", async () => {
  const r = await carve("big", { threshold: "8" });
  assert.equal(r.code, 0);
  assert.deepEqual(r.calls.map((c) => `${c.method} ${c.url}`), [
    "GET https://api.test/repos/o/r/issues/7/comments?per_page=100&page=1",
    "POST https://api.test/repos/o/r/issues/7/comments",
  ]);
  const body = JSON.parse(r.calls[1].body!).body as string;
  assert.ok(body.startsWith(`${MARKER}\n### DiffCarve: 3 layers proposed`));
  assert.match(body, /`big` changes 4 files/);
  assert.match(r.log, /Posted the dry-run comment/);
});

test("a re-run updates its own comment instead of adding another", async () => {
  const comments = [
    { id: 1, body: "looks big" },
    { id: 2, body: `${MARKER}\nold` },
  ];
  const r = await carve("big", { threshold: "1", comments });
  assert.deepEqual(r.calls.map((c) => `${c.method} ${c.url}`).at(-1), "PATCH https://api.test/repos/o/r/issues/comments/2");
  assert.match(r.log, /Updated the dry-run comment/);
});

test("a one-file diff and an empty diff make no API call and say why", async () => {
  const one = await carve("single", { threshold: "0" });
  assert.deepEqual(one.calls, []);
  assert.match(one.log, /changes one file \(src\/one\.ts\)\. Nothing to partition\.\nNo comment\./);
  const none = await carve("empty", { threshold: "0" });
  assert.deepEqual(none.calls, []);
  assert.match(none.log, /changes nothing since merge base .* Nothing to partition\./);
});

test("a read-only token warns without failing the PR", async () => {
  const r = await carve("big", { threshold: "1", status: 403 });
  assert.equal(r.code, 0);
  assert.match(r.log, /::warning::diffcarve: no permission to list comments \(403\)/);
});

test("other API errors, a bad threshold and a missing commit fail the step", async () => {
  assert.equal((await carve("big", { threshold: "1", status: 500 })).code, 1);
  const bad = await carve("big", { threshold: "lots" });
  assert.equal(bad.code, 1);
  assert.match(bad.log, /threshold must be a whole number/);
  const pr = { number: 7, head: { sha: "0".repeat(40), ref: "gone" }, base: { sha: sha("main") } };
  const shallow = await carve("big", { event: { pull_request: pr } });
  assert.equal(shallow.code, 1);
  assert.match(shallow.log, /fetch-depth: 0/);
});

test("an event that isn't a pull request does nothing", async () => {
  const r = await carve("big", { event: { push: {} } });
  assert.equal(r.code, 0);
  assert.deepEqual(r.calls, []);
});
