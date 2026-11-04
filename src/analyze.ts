import { execFileSync } from "node:child_process";
import { posix } from "node:path";
import { Project, ts } from "ts-morph";
import { complexity } from "./score.ts";

export type Analysis = {
  branch: string;
  mergeBase: string;
  // Every file the branch changes versus the merge base, sorted.
  changed: string[];
  // Dependency-ordered: nothing in layers[i] imports from layers[j] when j > i.
  layers: string[][];
  // Changed files outside the import graph: deleted, excluded by diffcarve.yml, or not TS/JS.
  outside: string[];
  // Import edges between changed files, importer -> imported.
  imports: Map<string, string[]>;
  // Lines added plus deleted, per changed file. Binary files count 0.
  lines: Map<string, number>;
  // Branch points after the change minus before it, per file in the graph.
  complexity: Map<string, number>;
};

const { dirname } = posix;
const CODE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
}

// Diffs `branch` against its merge base with `base`, HEAD by default, so run it from the branch the PR targets.
// Files matching an `exclude` glob stay outside the import graph.
export function analyze(cwd: string, branch: string, base = "HEAD", exclude: string[] = []): Analysis {
  for (const ref of [branch, base]) if (ref.startsWith("-")) throw new Error(`Not a branch name: ${ref}`);
  const mergeBase = git(cwd, ["merge-base", base, branch]).trim();
  const status = git(cwd, ["diff", "--name-status", "--no-renames", "-z", mergeBase, branch]).split("\0");
  status.pop(); // trailing NUL
  const lines = new Map<string, number>();
  for (const row of git(cwd, ["diff", "--numstat", "--no-renames", "-z", mergeBase, branch]).split("\0")) {
    const [added, deleted, path] = row.split("\t");
    if (path) lines.set(path, (Number(added) || 0) + (Number(deleted) || 0));
  }
  const changed: string[] = [];
  const outside: string[] = [];
  const cx = new Map<string, number>();
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve, moduleResolution: ts.ModuleResolutionKind.Bundler },
  });
  for (let i = 0; i < status.length; i += 2) {
    const [kind, path] = [status[i], status[i + 1]];
    changed.push(path);
    if (kind === "D" || !CODE.test(path) || exclude.some((g) => posix.matchesGlob(path, g))) outside.push(path);
    else {
      const text = git(cwd, ["show", `${branch}:${path}`]);
      project.createSourceFile(`/${path}`, text);
      const before = kind === "A" ? 0 : complexity(path, git(cwd, ["show", `${mergeBase}:${path}`]));
      cx.set(path, complexity(path, text) - before);
    }
  }
  changed.sort();
  outside.sort();

  const options = project.getCompilerOptions();
  const optionsFor = aliases(cwd, branch, project, options);
  const host = project.getModuleResolutionHost();
  const imports = new Map<string, string[]>();
  for (const sf of project.getSourceFiles()) {
    const from = sf.getFilePath();
    const opts = optionsFor(from);
    const deps = new Set<string>();
    // `imports` covers import/export-from, dynamic import(), and require() in JS.
    for (const lit of sf.getImportStringLiterals()) {
      const to = ts.resolveModuleName(lit.getLiteralText(), from, opts, host).resolvedModule?.resolvedFileName;
      if (to && to !== from && project.getSourceFile(to)) deps.add(to.slice(1));
    }
    imports.set(from.slice(1), [...deps].sort());
  }
  return { branch, mergeBase, changed, layers: layer(imports), outside, imports, lines, complexity: cx };
}

const CONFIG = /(^|\/)(tsconfig|jsconfig|package)\.json$/;

// Copies the tsconfig, jsconfig and package.json files above each changed file into the
// in-memory project, so package.json `imports` (`#app/x`) resolve, and returns the
// compiler options for a file: its nearest tsconfig's or jsconfig's `paths` (`@/lib/x`)
// on top of `base`. Configs come from the branch, not the working tree.
function aliases(cwd: string, branch: string, project: Project, base: ts.CompilerOptions) {
  const fs = project.getFileSystem();
  const dirs = new Set<string>();
  for (const sf of project.getSourceFiles()) for (let d: string = sf.getDirectoryPath(); !dirs.has(d); d = dirname(d)) dirs.add(d);
  const configs = git(cwd, ["ls-tree", "-r", "-z", "--name-only", branch]).split("\0").filter((p) => CONFIG.test(p));
  for (const p of configs) if (dirs.has(dirname(`/${p}`))) fs.writeFileSync(`/${p}`, git(cwd, ["show", `${branch}:${p}`]));
  const readFile = (p: string): string | undefined => {
    if (fs.fileExistsSync(p)) return fs.readFileSync(p);
    try {
      return git(cwd, ["show", `${branch}:${p.slice(1)}`]); // an `extends` outside the ancestor dirs
    } catch {
      return undefined; // `extends` from node_modules: not on the branch, so its `paths` are skipped
    }
  };
  const parseHost = { useCaseSensitiveFileNames: true, readDirectory: () => [], fileExists: (p: string) => readFile(p) !== undefined, readFile };
  const parsed = new Map<string, ts.CompilerOptions>();
  return (file: string): ts.CompilerOptions => {
    for (let d = dirname(file); ; d = dirname(d)) {
      const config = ["tsconfig.json", "jsconfig.json"].map((n) => `${d === "/" ? "" : d}/${n}`).find((p) => fs.fileExistsSync(p));
      if (config) {
        if (!parsed.has(config)) {
          const { config: json } = ts.readConfigFile(config, readFile);
          // Errors (an unknown `extends`, deprecated options) are ignored: `paths` is all we need.
          const { paths, baseUrl, pathsBasePath } = ts.parseJsonConfigFileContent(json ?? {}, parseHost, dirname(config)).options;
          parsed.set(config, { ...base, paths, baseUrl, pathsBasePath });
        }
        return parsed.get(config)!;
      }
      if (d === "/") return base;
    }
  };
}

// Groups files into layers by longest import chain beneath them. Import cycles share a layer.
export function layer(imports: Map<string, string[]>): string[][] {
  // Tarjan's SCC. With edges pointing importer -> imported, components come out
  // dependencies-first, which is the order the layer depths need.
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const comp = new Map<string, number>();
  const depth: number[] = [];
  const visit = (v: string) => {
    index.set(v, index.size);
    low.set(v, index.get(v)!);
    stack.push(v);
    onStack.add(v);
    for (const w of imports.get(v) ?? []) {
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v)!, index.get(w)!));
    }
    if (low.get(v) !== index.get(v)) return;
    const id = depth.length;
    const members: string[] = [];
    let w: string;
    do {
      w = stack.pop()!;
      onStack.delete(w);
      comp.set(w, id);
      members.push(w);
    } while (w !== v);
    let d = 0;
    for (const m of members)
      for (const dep of imports.get(m) ?? []) if (comp.get(dep) !== id) d = Math.max(d, depth[comp.get(dep)!] + 1);
    depth.push(d);
  };
  // ponytail: recursive DFS, fine for PR-sized graphs; go iterative if a diff ever has
  // an import chain thousands of files deep.
  for (const v of [...imports.keys()].sort()) if (!index.has(v)) visit(v);

  const layers: string[][] = [];
  for (const [file, id] of comp) (layers[depth[id]] ??= []).push(file);
  return layers.map((l) => l.sort());
}
