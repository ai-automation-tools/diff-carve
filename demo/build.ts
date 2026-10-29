// Builds the static demo: carves every sample with the real analyzer, then bakes the results
// into one HTML page. The browser only renders; nothing is analyzed or fetched client-side.
//   node demo/build.ts [outDir]   (default _site/)
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyze } from "../src/analyze.ts";
import { format, markdown } from "../src/run.ts";
import { scoreLayers } from "../src/score.ts";
import { fixtureRepo } from "../tests/fixture.ts";
import { SAMPLES, type Sample } from "./samples.ts";

const here = (f: string) => fileURLToPath(new URL(f, import.meta.url));

export function carve(s: Sample) {
  const repo = fixtureRepo({ pr: s.head }, s.base);
  try {
    const start = performance.now();
    const a = analyze(repo, "pr");
    const seconds = (performance.now() - start) / 1000;
    const scores = scoreLayers(a);
    const diff = execFileSync("git", ["diff", "--no-renames", a.mergeBase, "pr"], { cwd: repo, encoding: "utf8" });
    return {
      id: s.id,
      title: s.title,
      note: s.note,
      files: a.changed.length,
      lines: [...a.lines.values()].reduce((n, x) => n + x, 0),
      // Under two files the CLI's own "nothing to partition" line is the whole result.
      message: a.changed.length < 2 ? format(a, seconds).split("\n")[0] : undefined,
      layers: a.changed.length < 2 ? [] : a.layers.map((files, i) => ({
        ...scores[i],
        paths: files.map((f) => ({ path: f, imports: a.imports.get(f) ?? [], lines: a.lines.get(f) ?? 0 })),
      })),
      outside: a.outside,
      cli: format(a, seconds),
      comment: markdown(a, seconds),
      diff,
    };
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

export function buildDemo(): string {
  const { version } = JSON.parse(readFileSync(here("../package.json"), "utf8")) as { version: string };
  // `<` escaped so no sample text can close the <script> it sits in.
  const data = JSON.stringify({ version, samples: SAMPLES.map(carve) }).replace(/</g, "\\u003c");
  return readFileSync(here("index.html"), "utf8").replace("__DATA__", () => data);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] ?? "_site";
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "index.html"), buildDemo());
  copyFileSync(here("favicon.svg"), join(out, "favicon.svg"));
  console.log(`Wrote ${join(out, "index.html")}`);
}
