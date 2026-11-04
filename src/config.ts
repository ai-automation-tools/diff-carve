import { execFileSync } from "node:child_process";
import { parse } from "yaml";

export type Config = {
  // Lines changed (added plus deleted) at which the Action comments.
  threshold: number;
  // A layer scoring this or more passes.
  pass: number;
  // What a layer may spend before its score drops to the pass line; complexity is the complexity threshold.
  budgets: { lines: number; files: number; complexity: number; reverseDeps: number };
  // Per-language file-boundary rules: globs for files kept outside the import graph, such as generated code.
  languages: { typescript: { exclude: string[] } };
};

export const DEFAULTS: Config = {
  threshold: 400,
  pass: 50,
  budgets: { lines: 200, files: 10, complexity: 20, reverseDeps: 5 },
  languages: { typescript: { exclude: [] } },
};

export const FILE = "diffcarve.yml";

// Reads diffcarve.yml from `ref`, the branch the PR targets, so a PR can't loosen its own
// budgets. A ref without one gets the defaults.
export function loadConfig(cwd: string, ref: string): Config {
  const git = (args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (!git(["ls-tree", "--name-only", ref, "--", FILE]).trim()) return DEFAULTS;
  return parseConfig(git(["show", `${ref}:${FILE}`]));
}

// Every key is optional and falls back to DEFAULTS. Unknown keys and wrong types throw, naming the key.
export function parseConfig(text: string): Config {
  const config = merge(DEFAULTS, parse(text) ?? {}, "");
  if (config.pass > 100) throw new Error(`${FILE}: pass must be 100 or less, got ${config.pass}`);
  return config;
}

function merge<T>(defaults: T, raw: unknown, at: string): T {
  const fail = (want: string): never => {
    throw new Error(`${FILE}: ${at.slice(0, -1) || "the file"} must be ${want}, got ${JSON.stringify(raw)}`);
  };
  if (Array.isArray(defaults)) return Array.isArray(raw) && raw.every((x) => typeof x === "string") ? (raw as T) : fail("a list of globs");
  if (typeof defaults === "number") {
    // A zero budget would divide by zero; a zero threshold just means always comment.
    const min = at.startsWith("budgets.") ? 1 : 0;
    return Number.isInteger(raw) && (raw as number) >= min ? (raw as T) : fail(`a whole number, ${min} or more`);
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return fail("a mapping");
  const out = { ...defaults } as Record<string, unknown>;
  for (const [k, v] of Object.entries(raw)) {
    if (!(k in out)) throw new Error(`${FILE}: unknown key ${at}${k}`);
    out[k] = merge(out[k], v, `${at}${k}.`);
  }
  return out as T;
}
