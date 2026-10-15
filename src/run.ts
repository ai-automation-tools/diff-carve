import { createRequire } from "node:module";
import { analyze, type Analysis } from "./analyze.ts";
import { BUDGETS, PASS, scoreLayers, type LayerScore } from "./score.ts";

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

const HELP = `diffcarve ${version}

Usage:
  diffcarve analyze <branch> [--dry-run]
                               Split a branch's diff into dependency-ordered layers
                               and score each one. Diffs against the merge base with
                               HEAD, so run it from the branch the PR targets.
                               --dry-run prints the proposed stack as the markdown
                               a PR comment would carry.
  diffcarve --version          Print the version
  diffcarve --help             Print this help
`;

type Io = { out: (s: string) => void; err: (s: string) => void };

const defaultIo: Io = {
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
};

// Returns the process exit code. Kept free of process.exit so tests can call it.
export function run(argv: string[], io: Io = defaultIo, cwd = process.cwd()): number {
  const [cmd] = argv;
  if (cmd === undefined || cmd === "--help" || cmd === "-h") {
    io.out(HELP);
    return 0;
  }
  if (cmd === "--version" || cmd === "-v") {
    io.out(`${version}\n`);
    return 0;
  }
  if (cmd === "analyze") {
    const args = argv.slice(1);
    const dryRun = args.includes("--dry-run");
    const [branch, ...extra] = args.filter((x) => x !== "--dry-run");
    if (branch === undefined || extra.length) {
      io.err("Usage: diffcarve analyze <branch> [--dry-run]\n");
      return 1;
    }
    const start = performance.now();
    let a: Analysis;
    try {
      a = analyze(cwd, branch);
    } catch (e) {
      // git failures carry the useful text on stderr.
      const msg = (e as { stderr?: string }).stderr?.trim() || (e as Error).message;
      io.err(`diffcarve: could not analyze ${branch}: ${msg}\n`);
      return 1;
    }
    io.out((dryRun ? markdown : format)(a, (performance.now() - start) / 1000));
    return 0;
  }
  io.err(`Unknown command: ${cmd}\n\n${HELP}`);
  return 1;
}

export function format(a: Analysis, seconds: number): string {
  const base = a.mergeBase.slice(0, 7);
  if (a.changed.length === 0) return `${a.branch} changes nothing since merge base ${base}. Nothing to partition.\n`;
  if (a.changed.length === 1) return `${a.branch} changes one file (${a.changed[0]}). Nothing to partition.\n`;
  let s = `${a.branch}: ${a.changed.length} files changed since merge base ${base}, ${a.layers.length} layers.\n`;
  const scores = scoreLayers(a);
  a.layers.forEach((files, i) => {
    const l = scores[i];
    s += `\nLayer ${i + 1}: score ${l.score}, ${l.pass ? "pass" : "fail"} (${l.lines} lines, ${l.files} files, `;
    s += `complexity ${signed(l.complexity)}, ${l.reverseDeps} reverse deps)\n`;
    for (const f of files) {
      const deps = a.imports.get(f) ?? [];
      s += `  ${f}${deps.length ? `  <- imports ${deps.join(", ")}` : ""}\n`;
    }
  });
  if (a.outside.length) s += `\nOutside the import graph (deleted or not TS/JS)\n${a.outside.map((f) => `  ${f}\n`).join("")}`;
  return `${s}\nAnalyzed in ${seconds.toFixed(2)}s.\n`;
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

// The proposed stack as the body of a PR comment. Blocks nothing, approves nothing.
export function markdown(a: Analysis, seconds: number): string {
  if (a.changed.length < 2) return format(a, seconds);
  const scores = scoreLayers(a);
  const failing = scores.filter((l) => !l.pass).length;
  let s = `### DiffCarve: ${a.layers.length} layers proposed\n\n`;
  s += `\`${a.branch}\` changes ${a.changed.length} files since \`${a.mergeBase.slice(0, 7)}\`. `;
  s += failing ? `${failing} of ${a.layers.length} layers score under ${PASS}.\n\n` : `Every layer scores ${PASS} or more.\n\n`;
  s += "| Layer | Score | Lines | Files | Complexity Δ | Reverse deps |\n|--:|--:|--:|--:|--:|--:|\n";
  scores.forEach((l: LayerScore, i) => {
    s += `| ${i + 1} | ${l.score} ${l.pass ? "✅" : "❌"} | ${l.lines} | ${l.files} | ${signed(l.complexity)} | ${l.reverseDeps} |\n`;
  });
  a.layers.forEach((files, i) => {
    s += `\n<details><summary>Layer ${i + 1}</summary>\n\n${files.map((f) => `- \`${f}\``).join("\n")}\n\n</details>\n`;
  });
  if (a.outside.length) s += `\nOutside the import graph: ${a.outside.map((f) => `\`${f}\``).join(", ")}\n`;
  const b = BUDGETS;
  s += `\nEach input spends its share of 100 points as it climbs from 0 to twice its budget: `;
  s += `lines ${b.lines.weight} (budget ${b.lines.budget}), files ${b.files.weight} (${b.files.budget}), `;
  s += `complexity ${b.complexity.weight} (${b.complexity.budget}), reverse deps ${b.reverseDeps.weight} (${b.reverseDeps.budget}). `;
  s += `${PASS} or more passes. Dry run: nothing is blocked. Analyzed in ${seconds.toFixed(2)}s.\n`;
  return s;
}
