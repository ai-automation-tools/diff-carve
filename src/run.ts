import { createRequire } from "node:module";
import { analyze, type Analysis } from "./analyze.ts";

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

const HELP = `diffcarve ${version}

Usage:
  diffcarve analyze <branch>   Split a branch's diff into dependency-ordered layers.
                               Diffs against the merge base with HEAD, so run it
                               from the branch the PR targets.
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
    const branch = argv[1];
    if (branch === undefined) {
      io.err("Usage: diffcarve analyze <branch>\n");
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
    io.out(format(a, (performance.now() - start) / 1000));
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
  a.layers.forEach((files, i) => {
    s += `\nLayer ${i + 1}\n`;
    for (const f of files) {
      const deps = a.imports.get(f) ?? [];
      s += `  ${f}${deps.length ? `  <- imports ${deps.join(", ")}` : ""}\n`;
    }
  });
  if (a.outside.length) s += `\nOutside the import graph (deleted or not TS/JS)\n${a.outside.map((f) => `  ${f}\n`).join("")}`;
  return `${s}\nAnalyzed in ${seconds.toFixed(2)}s.\n`;
}
