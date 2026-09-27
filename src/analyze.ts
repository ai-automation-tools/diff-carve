import { execFileSync } from "node:child_process";
import { Project, ts } from "ts-morph";

export type Analysis = {
  branch: string;
  mergeBase: string;
  // Every file the branch changes versus the merge base, sorted.
  changed: string[];
  // Dependency-ordered: nothing in layers[i] imports from layers[j] when j > i.
  layers: string[][];
  // Changed files outside the import graph: deleted, or not TS/JS.
  outside: string[];
  // Import edges between changed files, importer -> imported.
  imports: Map<string, string[]>;
};

const CODE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
}

// Diffs `branch` against its merge base with HEAD, so run it from the branch the PR targets.
export function analyze(cwd: string, branch: string): Analysis {
  if (branch.startsWith("-")) throw new Error(`Not a branch name: ${branch}`);
  const mergeBase = git(cwd, ["merge-base", "HEAD", branch]).trim();
  const status = git(cwd, ["diff", "--name-status", "--no-renames", "-z", mergeBase, branch]).split("\0");
  status.pop(); // trailing NUL
  const changed: string[] = [];
  const outside: string[] = [];
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve, moduleResolution: ts.ModuleResolutionKind.Bundler },
  });
  for (let i = 0; i < status.length; i += 2) {
    const [kind, path] = [status[i], status[i + 1]];
    changed.push(path);
    if (kind === "D" || !CODE.test(path)) outside.push(path);
    else project.createSourceFile(`/${path}`, git(cwd, ["show", `${branch}:${path}`]));
  }
  changed.sort();
  outside.sort();

  // ponytail: resolves relative imports only. tsconfig `paths` aliases (`@/lib/x`) and
  // workspace packages don't resolve yet; the spike (Slice 0b) will say whether that matters.
  const host = project.getModuleResolutionHost();
  const options = project.getCompilerOptions();
  const imports = new Map<string, string[]>();
  for (const sf of project.getSourceFiles()) {
    const from = sf.getFilePath();
    const deps = new Set<string>();
    // `imports` covers import/export-from, dynamic import(), and require() in JS.
    for (const lit of sf.getImportStringLiterals()) {
      const to = ts.resolveModuleName(lit.getLiteralText(), from, options, host).resolvedModule?.resolvedFileName;
      if (to && to !== from && project.getSourceFile(to)) deps.add(to.slice(1));
    }
    imports.set(from.slice(1), [...deps].sort());
  }
  return { branch, mergeBase, changed, layers: layer(imports), outside, imports };
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
