import { ts } from "ts-morph";
import type { Analysis } from "./analyze.ts";
import { DEFAULTS, type Config } from "./config.ts";

// Each input spends its share of 100 points as it climbs from 0 to twice its budget, so a
// layer sitting exactly on every budget scores 50, the default pass line. Budgets and the
// pass line come from diffcarve.yml; the weights are fixed.
export const WEIGHTS = { lines: 40, files: 20, complexity: 25, reverseDeps: 15 } as const;

export type LayerScore = {
  score: number;
  pass: boolean;
  // Lines added plus lines deleted across the layer's files.
  lines: number;
  files: number;
  // Cyclomatic complexity after the change minus before it, summed over the layer.
  complexity: number;
  // Changed files outside the layer that import a file inside it.
  reverseDeps: number;
};

export function scoreLayers(a: Analysis, config: Config = DEFAULTS): LayerScore[] {
  const at = new Map(a.layers.flatMap((files, i) => files.map((f) => [f, i] as const)));
  return a.layers.map((files, i) => {
    const importers = new Set<string>();
    for (const [from, deps] of a.imports) if (at.get(from) !== i && deps.some((d) => at.get(d) === i)) importers.add(from);
    const inputs = {
      lines: files.reduce((n, f) => n + (a.lines.get(f) ?? 0), 0),
      files: files.length,
      complexity: files.reduce((n, f) => n + (a.complexity.get(f) ?? 0), 0),
      reverseDeps: importers.size,
    };
    let spent = 0;
    for (const k of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
      // A drop in complexity spends nothing; it doesn't earn points back either.
      spent += WEIGHTS[k] * Math.min(1, Math.max(0, inputs[k]) / (2 * config.budgets[k]));
    }
    const score = Math.round(100 - spent);
    return { score, pass: score >= config.pass, ...inputs };
  });
}

// Branch points (if, loop, case, catch, ?:, &&, ||, ??): McCabe's count without the +1 per
// function, so moving code between files or functions nets out to zero.
export function complexity(path: string, text: string): number {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest);
  let n = 0;
  const visit = (node: ts.Node) => {
    switch (node.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CaseClause:
      case ts.SyntaxKind.CatchClause:
      case ts.SyntaxKind.ConditionalExpression:
        n++;
        break;
      case ts.SyntaxKind.BinaryExpression: {
        const op = (node as ts.BinaryExpression).operatorToken.kind;
        if (
          op === ts.SyntaxKind.AmpersandAmpersandToken ||
          op === ts.SyntaxKind.BarBarToken ||
          op === ts.SyntaxKind.QuestionQuestionToken
        )
          n++;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return n;
}
