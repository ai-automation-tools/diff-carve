import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { buildDemo, carve } from "../demo/build.ts";
import { SAMPLES } from "../demo/samples.ts";

const sample = (id: string) => carve(SAMPLES.find((s) => s.id === id)!);

test("the demo page carries the source bar, every sample, and no local paths", () => {
  const html = buildDemo();
  assert.ok(!html.includes("__DATA__"));
  assert.match(html, /class="src-bar"[\s\S]*?href="https:\/\/github\.com\/ai-automation-tools\/diff-carve"/);
  for (const s of SAMPLES) assert.ok(html.includes(JSON.stringify(s.title)), s.id);
  assert.ok(!html.includes(tmpdir().replace(/\\/g, "\\\\")) && !html.includes(tmpdir()), "a scratch path leaked");
  assert.doesNotMatch(html, /[A-Z]:\\\\(Users|AI_Agents)/);
});

test("the samples carve into layers where nothing imports from a later one", () => {
  const p = sample("profiles");
  assert.equal(p.layers.length, 4);
  assert.deepEqual(p.outside, ["docs/profiles.md"]);
  const at = new Map(p.layers.flatMap((l, i) => l.paths.map((f) => [f.path, i] as const)));
  for (const l of p.layers) for (const f of l.paths) for (const d of f.imports) assert.ok(at.get(d)! < at.get(f.path)!, `${f.path} -> ${d}`);
});

test("the alias sample resolves @/ imports and fails the layer holding the rules file", () => {
  const c = sample("checkout");
  const rules = c.layers.find((l) => l.paths.some((f) => f.path === "src/checkout/rules.ts"))!;
  assert.equal(rules.pass, false);
  const submit = c.layers.flatMap((l) => l.paths).find((f) => f.path === "src/checkout/submit.ts")!;
  assert.deepEqual(submit.imports, ["src/checkout/coupon.ts", "src/checkout/rules.ts", "src/types/order.ts"]);
});

test("the one-file sample says there is nothing to partition", () => {
  const o = sample("one-file");
  assert.deepEqual(o.layers, []);
  assert.match(o.message!, /Nothing to partition/);
});
