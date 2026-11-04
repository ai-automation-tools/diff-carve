import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { action } from "../src/action.ts";
import { DEFAULTS, parseConfig } from "../src/config.ts";
import { run } from "../src/run.ts";
import { fixtureRepo } from "./fixture.ts";

// 5 lines changed: data.ts imports schema.ts, plus a generated file.
const pr = {
  "src/schema.ts": "export type T = number;\n",
  "src/data.ts": 'import type { T } from "./schema.ts";\nexport const get = (x: T): T => (x > 0 ? x : 0);\n',
  "src/api.generated.ts": 'import { get } from "./data.ts";\nexport const api = get;\n',
};
const strict = "threshold: 5\npass: 60\nbudgets:\n  lines: 1\nlanguages:\n  typescript:\n    exclude: ['**/*.generated.ts']\n";
const plain = fixtureRepo({ pr });
const tuned = fixtureRepo({ pr }, { "diffcarve.yml": strict });
test.after(() => [plain, tuned].forEach((d) => rmSync(d, { recursive: true, force: true })));

function cli(cwd: string, argv: string[]) {
  let out = "";
  let err = "";
  const code = run(argv, { out: (s) => (out += s), err: (s) => (err += s) }, cwd);
  return { code, out, err };
}

test("an empty or missing config is the defaults; set keys override only themselves", () => {
  assert.deepEqual(parseConfig(""), DEFAULTS);
  const c = parseConfig(strict);
  assert.deepEqual(c.budgets, { ...DEFAULTS.budgets, lines: 1 });
  assert.equal(c.threshold, 5);
  assert.equal(c.pass, 60);
  assert.deepEqual(c.languages.typescript.exclude, ["**/*.generated.ts"]);
});

test("a bad config names the key instead of guessing", () => {
  assert.throws(() => parseConfig("budget:\n  lines: 100\n"), /unknown key budget$/);
  assert.throws(() => parseConfig("budgets:\n  lines: lots\n"), /budgets\.lines must be a whole number, 1 or more/);
  assert.throws(() => parseConfig("budgets:\n  files: 0\n"), /budgets\.files must be a whole number, 1 or more/);
  assert.throws(() => parseConfig("threshold: -1\n"), /threshold must be a whole number, 0 or more/);
  assert.throws(() => parseConfig("pass: 101\n"), /pass must be 100 or less/);
  assert.throws(() => parseConfig("languages:\n  typescript:\n    exclude: '*.gen.ts'\n"), /exclude must be a list of globs/);
  assert.throws(() => parseConfig("- 1\n"), /the file must be a mapping/);
});

test("changing diffcarve.yml changes the CLI's layers, scores and pass line", () => {
  const before = cli(plain, ["analyze", "--dry-run", "pr"]);
  assert.equal(before.code, 0);
  assert.match(before.out, /3 layers proposed/);
  assert.match(before.out, /Every layer scores 50 or more\./);
  assert.match(before.out, /lines 40 \(budget 200\)/);

  const after = cli(tuned, ["analyze", "--dry-run", "pr"]);
  assert.equal(after.code, 0);
  assert.match(after.out, /2 layers proposed/);
  assert.match(after.out, /1 of 2 layers score under 60\./);
  assert.match(after.out, /\| 2 \| 58 ❌ \| 2 \|/);
  assert.match(after.out, /lines 40 \(budget 1\)/);
  assert.match(after.out, /Outside the import graph: `src\/api\.generated\.ts`/);
});

test("a broken diffcarve.yml fails the CLI with the reason", () => {
  const bad = fixtureRepo({ pr }, { "diffcarve.yml": "budgets: 3\n" });
  try {
    const r = cli(bad, ["analyze", "pr"]);
    assert.equal(r.code, 1);
    assert.match(r.err, /diffcarve\.yml: budgets must be a mapping, got 3/);
  } finally {
    rmSync(bad, { recursive: true, force: true });
  }
});

test("the Action takes its threshold from diffcarve.yml on the base, and the input overrides it", async () => {
  const sha = (ref: string) => execFileSync("git", ["rev-parse", ref], { cwd: tuned, encoding: "utf8" }).trim();
  const event = join(tuned, ".git", "event.json");
  writeFileSync(event, JSON.stringify({ pull_request: { number: 1, head: { sha: sha("pr"), ref: "pr" }, base: { sha: sha("main") } } }));
  const http = (async () => new Response("[]")) as unknown as typeof fetch;
  const go = async (threshold?: string) => {
    let log = "";
    const env = { GITHUB_EVENT_PATH: event, GITHUB_WORKSPACE: tuned, GITHUB_REPOSITORY: "o/r", DIFFCARVE_THRESHOLD: threshold };
    assert.equal(await action(env, (s) => (log += s), http), 0);
    return log;
  };
  assert.match(await go(), /Posted the dry-run comment/);
  assert.match(await go(""), /Posted the dry-run comment/);
  assert.match(await go("400"), /5 lines changed, under the threshold of 400\. No comment\./);
});
