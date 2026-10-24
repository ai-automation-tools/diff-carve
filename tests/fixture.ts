import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

type Files = Record<string, string>;

function write(dir: string, files: Files) {
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
}

// A throwaway repo: `main` has a README plus `base`, each branch commits the given files on top of it.
export function fixtureRepo(branches: Record<string, Files>, base: Files = {}): string {
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
