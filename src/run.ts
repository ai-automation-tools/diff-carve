import { createRequire } from "node:module";

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

const HELP = `diffcarve ${version}

Usage:
  diffcarve analyze <branch>   Split a branch's diff into dependency-ordered layers
  diffcarve --version          Print the version
  diffcarve --help             Print this help
`;

type Io = { out: (s: string) => void; err: (s: string) => void };

const defaultIo: Io = {
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
};

// Returns the process exit code. Kept free of process.exit so tests can call it.
export function run(argv: string[], io: Io = defaultIo): number {
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
    io.err("diffcarve analyze is not built yet. See docs/ROADMAP.md, Slice 0.\n");
    return 1;
  }
  io.err(`Unknown command: ${cmd}\n\n${HELP}`);
  return 1;
}
