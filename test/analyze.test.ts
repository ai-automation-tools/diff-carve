import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { analyze, layer } from "../src/analyze.ts";
import { run } from "../src/run.ts";
import { BUDGETS, PASS, complexity, scoreLayers } from "../src/score.ts";

type Files = Record<string, string>;

function write(dir: string, files: Files) {
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
}

// A throwaway repo: `main` has a README plus `base`, each branch commits the given files on top of it.
function fixtureRepo(branches: Record<string, Files>, base: Files = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "diffcarve-"));
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd: dir, stdio: "pipe" });
  git("init", "-q", "-b", "main");
  write(dir, { "README.md": "fixture\n", ...base });
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  for (const [name, files] of Object.entries(branches)) {
    git("checkout", "-q", "-b", name, "main");
    write(dir, files);
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
  // Grows src/grow.ts from 1 branch point to 5, and adds a caller with 1.
  grow: {
    "src/grow.ts": "export const f = (x: number) => {\n  if (x > 1 && x < 9) return 1;\n  for (const y of [x]) if (y) return y ?? 2;\n  return 0;\n};\n",
    "src/use.ts": 'import { f } from "./grow.ts";\nexport const g = () => (f(1) ? 1 : 0);\n',
  },
}, { "src/grow.ts": "export const f = (x: number) => {\n  if (x > 1) return 1;\n  return 0;\n};\n" });
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
  assert.match(r.out, /Layer 1: score \d+, pass \(1 lines, 1 files, complexity 0, 2 reverse deps\)\n {2}src\/schema\/user\.ts\n/);
  assert.match(r.out, /\nLayer 2: [^\n]+\n {2}src\/data\/userRepo\.ts {2}<- imports src\/schema\/user\.ts/);
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

test("complexity counts branch points", () => {
  assert.equal(complexity("a.ts", "export const x = 1;\n"), 0);
  const text = "function f(a){ if (a) {} else if (!a) {} while (a) {} do {} while (a); switch (a) { case 1: case 2: default: }\n" +
    "try {} catch {} return a ? a && 1 : (a || a) ?? 2; }";
  assert.equal(complexity("a.js", text), 11);
  assert.equal(complexity("a.tsx", "export const C = (p: { a: boolean }) => (p.a ? <b /> : <i />);\n"), 1);
});

test("each layer is scored on lines, files, complexity delta and reverse deps", () => {
  const a = analyze(repo, "grow");
  assert.deepEqual(a.layers, [["src/grow.ts"], ["src/use.ts"]]);
  assert.deepEqual(scoreLayers(a), [
    { score: 95, pass: true, lines: 3, files: 1, complexity: 4, reverseDeps: 1 },
    { score: 98, pass: true, lines: 2, files: 1, complexity: 1, reverseDeps: 0 },
  ]);
});

test("a layer on every budget scores exactly the pass line; a huge one scores 0", () => {
  // Layer 1 holds n files carrying `lines` and `cx` each; `importers` files in layer 2 import all of them.
  const stack = (n: number, lines: number, cx: number, importers: number) => {
    const low = Array.from({ length: n }, (_, i) => `low${i}.ts`);
    const high = Array.from({ length: importers }, (_, i) => `high${i}.ts`);
    return {
      branch: "b", mergeBase: "0", changed: [...low, ...high], outside: [], layers: [low, high],
      imports: new Map([...low.map((f) => [f, []] as [string, string[]]), ...high.map((f) => [f, low] as [string, string[]])]),
      lines: new Map(low.map((f) => [f, lines])),
      complexity: new Map(low.map((f) => [f, cx])),
    };
  };
  const b = BUDGETS;
  const n = b.files.budget;
  assert.deepEqual(scoreLayers(stack(n, b.lines.budget / n, b.complexity.budget / n, b.reverseDeps.budget))[0], {
    score: PASS, pass: true, lines: 200, files: 10, complexity: 20, reverseDeps: 5,
  });
  assert.equal(scoreLayers(stack(2 * n, b.lines.budget, b.complexity.budget, 2 * b.reverseDeps.budget))[0].score, 0);
  // Taking complexity out earns nothing back.
  assert.equal(scoreLayers(stack(1, 0, -9, 0))[0].score, scoreLayers(stack(1, 0, 0, 0))[0].score);
  assert.equal(scoreLayers(stack(1, 0, -9, 0))[0].complexity, -9);
});

test("--dry-run prints the stack as PR-comment markdown", () => {
  const r = cli(["analyze", "--dry-run", "layered"]);
  assert.equal(r.code, 0);
  assert.match(r.out, /^### DiffCarve: 4 layers proposed\n\n`layered` changes 6 files since `[0-9a-f]{7}`\. Every layer scores 50 or more\./);
  assert.match(r.out, /\| Layer \| Score \| Lines \| Files \| Complexity Δ \| Reverse deps \|/);
  assert.match(r.out, /\| 1 \| \d+ ✅ \| 1 \| 1 \| 0 \| 2 \|/);
  assert.match(r.out, /<summary>Layer 4<\/summary>\n\n- `src\/api\/index\.ts`\n- `src\/ui\/UserCard\.tsx`\n/);
  assert.match(r.out, /Outside the import graph: `docs\/notes\.md`/);
  assert.match(r.out, /Dry run: nothing is blocked\./);
  assert.equal(cli(["analyze", "layered", "--dry-run"]).out.split("\n")[0], "### DiffCarve: 4 layers proposed");
});

test("--dry-run on an empty or one-file diff still says there is nothing to partition", () => {
  assert.match(cli(["analyze", "empty", "--dry-run"]).out, /Nothing to partition\./);
  assert.equal(cli(["analyze", "single", "--dry-run"]).out, "single changes one file (src/one.ts). Nothing to partition.\n");
});

test("analyze rejects a second branch", () => {
  const r = cli(["analyze", "layered", "cycle"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /Usage: diffcarve analyze <branch> \[--dry-run\]/);
});
