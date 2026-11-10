import { readFileSync } from "node:fs";
import { analyze, type Analysis } from "./analyze.ts";
import { loadConfig, type Config } from "./config.ts";
import { format, markdown } from "./run.ts";
import { openStack, stackLayers, type Call, type Pr } from "./stack.ts";

// First line of the one comment DiffCarve owns on a PR, so a re-run edits it instead of adding another.
export const MARKER = "<!-- diffcarve -->";

type Env = Record<string, string | undefined>;

// The Action for one pull_request event: silent under the threshold (the `threshold` input, else
// diffcarve.yml's on the base branch), otherwise posts or updates one comment through the GitHub API.
// With DIFFCARVE_DRY_RUN=false it first opens the layers as a stack of PRs (see openStack).
// Never blocks, merges or approves anything. Returns the exit code.
export async function action(env: Env, log: (s: string) => void, http: typeof fetch = fetch): Promise<number> {
  const pr = (JSON.parse(readFileSync(env.GITHUB_EVENT_PATH ?? "", "utf8")) as { pull_request?: Pr }).pull_request;
  if (!pr) {
    log("diffcarve: not a pull_request event. Nothing to do.\n");
    return 0;
  }
  const cwd = env.GITHUB_WORKSPACE || process.cwd();
  const why = (e: unknown) => (e as { stderr?: string }).stderr?.trim() || (e as Error).message;
  let config: Config;
  try {
    config = loadConfig(cwd, pr.base.sha);
  } catch (e) {
    log(`diffcarve: could not read the config (check out with fetch-depth: 0): ${why(e)}\n`);
    return 1;
  }
  const threshold = env.DIFFCARVE_THRESHOLD ? Number(env.DIFFCARVE_THRESHOLD) : config.threshold;
  if (!Number.isInteger(threshold) || threshold < 0) {
    log(`diffcarve: threshold must be a whole number of lines, got "${env.DIFFCARVE_THRESHOLD}".\n`);
    return 1;
  }
  if (!["", "true", "false"].includes(env.DIFFCARVE_DRY_RUN ?? "")) {
    log(`diffcarve: dry-run must be true or false, got "${env.DIFFCARVE_DRY_RUN}".\n`);
    return 1;
  }
  const dryRun = env.DIFFCARVE_DRY_RUN !== "false";
  const start = performance.now();
  let a: Analysis;
  try {
    a = { ...analyze(cwd, pr.head.sha, pr.base.sha, config.languages.typescript.exclude), branch: pr.head.ref };
  } catch (e) {
    log(`diffcarve: could not analyze the PR (check out with fetch-depth: 0): ${why(e)}\n`);
    return 1;
  }
  const seconds = (performance.now() - start) / 1000;
  const total = [...a.lines.values()].reduce((x, y) => x + y, 0);
  if (total < threshold) {
    log(`diffcarve: ${total} lines changed, under the threshold of ${threshold}. No comment.\n`);
    return 0;
  }
  if (a.changed.length < 2) {
    log(`diffcarve: ${format(a, seconds, config)}No comment.\n`);
    return 0;
  }

  const api = `${env.GITHUB_API_URL || "https://api.github.com"}/repos/${env.GITHUB_REPOSITORY}`;
  const call: Call = (path, method = "GET", body, headers = {}) =>
    http(`${api}${path}`, {
      method,
      headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "diffcarve", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const fail = async (res: Response, what: string) => {
    // A fork's PR gets a read-only token: say so, but a dry run must not fail the PR's checks.
    if (res.status === 403) {
      const grant = dryRun ? "pull-requests: write" : "contents: write and pull-requests: write";
      log(`::warning::diffcarve: no permission to ${what} (${res.status}). Grant ${grant}; fork PRs can't.\n`);
      return 0;
    }
    log(`diffcarve: could not ${what}: ${res.status} ${await res.text()}\n`);
    return 1;
  };

  let opened = "";
  if (!dryRun) {
    if (stackLayers(a).length < 2) log("diffcarve: everything lands in one layer, so there is no stack to open.\n");
    else {
      const s = await openStack(cwd, a, pr, call);
      if ("res" in s) return fail(s.res, s.what);
      if (!s.prs.length) {
        log(`diffcarve: this PR was carved into a stack on an earlier run. Delete its diffcarve/${pr.number}/ branches to carve it again.\n`);
        return 0;
      }
      const list = s.prs.map((p) => `#${p}`);
      opened = `\nOpened as a GitHub stack, bottom first: ${list.join(" → ")}. This PR stays open; DiffCarve closes and merges nothing.\n`;
      log(`diffcarve: opened ${s.prs.length} layer PRs as a stack: ${list.join(", ")}.\n`);
    }
  }

  let existing: number | undefined;
  for (let page = 1; existing === undefined; page++) {
    const res = await call(`/issues/${pr.number}/comments?per_page=100&page=${page}`);
    if (!res.ok) return fail(res, "list comments");
    const comments = (await res.json()) as { id: number; body?: string }[];
    existing = comments.find((c) => c.body?.startsWith(MARKER))?.id;
    if (comments.length < 100) break;
  }
  const body = `${MARKER}\n${markdown(a, seconds, config)}${opened}`;
  const res = existing === undefined ? await call(`/issues/${pr.number}/comments`, "POST", { body }) : await call(`/issues/comments/${existing}`, "PATCH", { body });
  if (!res.ok) return fail(res, existing === undefined ? "post the comment" : "update the comment");
  log(`diffcarve: ${total} lines changed, ${a.layers.length} layers. ${existing === undefined ? "Posted" : "Updated"} the ${dryRun ? "dry-run " : ""}comment in ${seconds.toFixed(2)}s.\n`);
  return 0;
}
