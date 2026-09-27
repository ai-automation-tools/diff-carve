import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { analyze, layer } from "../src/analyze.ts";
import { run } from "../src/run.ts";

// A throwaway repo: `main` has a README, each branch commits the given files on top of it.
function fixtureRepo(branches: Record<string, Record<string, string>>): string {
  const dir = mkdtempSync(join(tmpdir(), "diffcarve-"));
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd: dir, stdio: "pipe" });
  git("init", "-q", "-b", "main");
  writeFileSync(join(dir, "README.md"), "fixture\n");
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  for (const [name, files] of Object.entries(branches)) {
    git("checkout", "-q", "-b", name, "main");
    for (const [path, body] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), body);
    }
    git("add", "-A");
    git("commit", "-q", "--allow-empty", "-m", name);
  }
  git("checkout", "-q", "main");
  return dir;
}

const layered = {
  // Named so alphabetical order is not dependency order.
  "src/ui/UserCard.tsx": 'import { getUser } from "../api/users.ts";\nexport const UserCard = () => <div>{getUser(1).name}</div>;\n',
  "src/api/users.ts": 'import { findUser } from "../data/userRepo.js";\nexport const getUser = (id: number) => findUser(id);\n',
  "src/data/userRepo.ts": 'import type { User } from "../schema/user";\nexport const findUser = (id: number): User => ({ id, name: "x" });\n',
  "src/schema/user.ts": "export type User = { id: number; name: string };\n",
  "src/api/index.ts": 'export * from "./users.ts";\nexport { User } from "../schema/user.ts";\n',
  "docs/notes.md": "not code\n",
};

const repo = fixtureRepo({
  layered,
  empty: {},
  single: { "src/one.ts": "export const one = 1;\n" },
  cycle: {
    "a.ts": 'import { b } from "./b";\nexport const a = () => b;\n',
    "b.ts": 'import { a } from "./a";\nexport const b = () => a;\n',
    "c.js": 'const { a } = require("./a");\nmodule.exports = a;\n',
  },
});
test.after(() => rmSync(repo, { recursive: true, force: true }));

test("a schema -> data -> API -> UI diff comes out in that order", () => {
  const a = analyze(repo, "layered");
  assert.deepEqual(a.layers, [
    ["src/schema/user.ts"],
    ["src/data/userRepo.ts"],
    ["src/api/users.ts"],
    ["src/api/index.ts", "src/ui/UserCard.tsx"],
  ]);
  assert.deepEqual(a.outside, ["docs/notes.md"]);
  assert.deepEqual(a.imports.get("src/api/index.ts"), ["src/api/users.ts", "src/schema/user.ts"]);
});

test("no layer imports from a later one", () => {
  for (const branch of ["layered", "cycle"]) {
    const a = analyze(repo, branch);
    const at = new Map(a.layers.flatMap((files, i) => files.map((f) => [f, i] as const)));
    for (const [from, deps] of a.imports) for (const to of deps) assert.ok(at.get(to)! <= at.get(from)!, `${from} -> ${to}`);
  }
});

test("an import cycle shares one layer", () => {
  assert.deepEqual(analyze(repo, "cycle").layers, [["a.ts", "b.ts"], ["c.js"]]);
});

test("the same diff always gives the same layers", () => {
  assert.deepEqual(analyze(repo, "layered"), analyze(repo, "layered"));
});

test("layer() handles files with no changed imports as one layer", () => {
  assert.deepEqual(layer(new Map([["b.ts", []], ["a.ts", []]])), [["a.ts", "b.ts"]]);
  assert.deepEqual(layer(new Map()), []);
});

function cli(argv: string[]) {
  let out = "";
  let err = "";
  const code = run(argv, { out: (s) => (out += s), err: (s) => (err += s) }, repo);
  return { code, out, err };
}

test("analyze prints numbered layers and the analysis time", () => {
  const r = cli(["analyze", "layered"]);
  assert.equal(r.code, 0);
  assert.match(r.out, /6 files changed since merge base [0-9a-f]{7}, 4 layers/);
  assert.match(r.out, /Layer 1\n {2}src\/schema\/user\.ts\n\nLayer 2\n {2}src\/data\/userRepo\.ts {2}<- imports src\/schema\/user\.ts/);
  assert.match(r.out, /Outside the import graph[^\n]*\n {2}docs\/notes\.md/);
  assert.match(r.out, /Analyzed in \d+\.\d\ds\.\n$/);
});

test("an empty diff says there is nothing to partition, not an error", () => {
  const r = cli(["analyze", "empty"]);
  assert.equal(r.code, 0);
  assert.match(r.out, /empty changes nothing since merge base [0-9a-f]{7}\. Nothing to partition\./);
});

test("a one-file diff says there is nothing to partition, not an error", () => {
  const r = cli(["analyze", "single"]);
  assert.equal(r.code, 0);
  assert.equal(r.out, "single changes one file (src/one.ts). Nothing to partition.\n");
});

test("an unknown branch fails with git's reason", () => {
  const r = cli(["analyze", "no-such-branch"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /could not analyze no-such-branch: .+/);
});

test("analyze without a branch prints its usage", () => {
  const r = cli(["analyze"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /Usage: diffcarve analyze <branch>/);
});
