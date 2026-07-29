/**
 * Heuristic code review.
 *
 * This is real static analysis, not a mock: every score below is derived from
 * something measurable in the submitted source. When ANTHROPIC_API_KEY is set,
 * /api/ai augments these findings with a model-written summary — but the
 * numbers always come from here so they stay reproducible.
 */

export interface ReviewScore {
  label: string;
  value: number;
  note: string;
}

export interface CodeReview {
  scores: ReviewScore[];
  overall: number;
  suggestions: string[];
  strengths: string[];
}

const LOOP_RE = /\b(for|while)\s*\(/g;

/** Rough nesting depth of loops, by tracking braces between loop keywords. */
function maxLoopDepth(code: string): number {
  let depth = 0;
  let max = 0;
  const stack: boolean[] = [];
  const tokens = code.split(/([{}])|\b(for|while)\b/).filter(Boolean);

  for (const t of tokens) {
    if (t === "for" || t === "while") stack.push(true);
    else if (t === "{") {
      if (stack.length && stack[stack.length - 1] === true) {
        stack[stack.length - 1] = false;
        depth++;
        max = Math.max(max, depth);
        stack.push(false);
      } else stack.push(false);
    } else if (t === "}") {
      const popped = stack.pop();
      if (popped === false && depth > 0) {
        // Only decrement when this brace closed a loop body we counted.
      }
      if (stack.length === 0) depth = 0;
    }
  }
  // Fall back to a simpler signal if brace tracking was inconclusive.
  if (max === 0) {
    const loops = code.match(LOOP_RE)?.length ?? 0;
    return loops >= 2 ? 2 : loops;
  }
  return max;
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function reviewCode(
  code: string,
  opts: { passed: number; total: number; verdict: string },
): CodeReview {
  const lines = code.split("\n");
  const codeLines = lines.filter((l) => l.trim() && !l.trim().startsWith("//"));
  const commentLines = lines.filter((l) => l.trim().startsWith("//") || l.trim().startsWith("#"));
  const suggestions: string[] = [];
  const strengths: string[] = [];

  // ── Correctness ──────────────────────────────────────────────────
  const ratio = opts.total > 0 ? opts.passed / opts.total : 0;
  const correctness = opts.verdict === "Needs Sandbox" ? 0 : clamp(ratio * 100);
  const correctnessNote =
    opts.verdict === "Needs Sandbox"
      ? "Not executed — no sandbox for this language"
      : ratio === 1
        ? `All ${opts.total} test cases passed`
        : `${opts.passed}/${opts.total} test cases passed`;
  if (ratio === 1) strengths.push("Passes every test case, including the edge cases.");
  else if (opts.total > 0 && opts.verdict !== "Needs Sandbox") {
    suggestions.push(`Fix the ${opts.total - opts.passed} failing case(s) before optimising anything else.`);
  }

  // ── Optimisation ─────────────────────────────────────────────────
  const depth = maxLoopDepth(code);
  const hasNestedScan = depth >= 2;
  const linearInLoop = /for\s*\([^)]*\)[\s\S]{0,200}?\.(indexOf|includes|find)\(/.test(code);
  let optimization = 100;
  if (hasNestedScan) {
    optimization -= 35;
    suggestions.push("Nested loops detected — this looks quadratic. A hash map or two pointers often collapses it to O(n).");
  }
  if (linearInLoop) {
    optimization -= 20;
    suggestions.push("`indexOf`/`includes` inside a loop is a hidden inner scan. Use a Set or Map for O(1) membership.");
  }
  if (/\.sort\(/.test(code) && !hasNestedScan) {
    optimization -= 5;
  }
  if (!hasNestedScan && !linearInLoop) strengths.push("Single-pass structure — no hidden quadratic scans.");
  optimization = clamp(optimization);

  // ── Naming ───────────────────────────────────────────────────────
  const declared = [...code.matchAll(/\b(?:let|const|var)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  const loopCounters = new Set(["i", "j", "k", "n", "m"]);
  const cryptic = declared.filter((v) => v.length <= 2 && !loopCounters.has(v));
  let naming = 100 - cryptic.length * 12;
  if (cryptic.length > 0) {
    suggestions.push(
      `Rename short variables (${cryptic.slice(0, 3).map((c) => `\`${c}\``).join(", ")}) to something that states intent.`,
    );
  } else if (declared.length > 0) {
    strengths.push("Variable names read clearly.");
  }
  naming = clamp(naming);

  // ── Readability ──────────────────────────────────────────────────
  const longLines = lines.filter((l) => l.length > 100).length;
  const commentRatio = codeLines.length ? commentLines.length / codeLines.length : 0;
  let readability = 100;
  if (longLines > 0) {
    readability -= longLines * 8;
    suggestions.push(`${longLines} line(s) exceed 100 characters — break them up.`);
  }
  if (codeLines.length > 25 && commentRatio < 0.05) {
    readability -= 12;
    suggestions.push("A one-line comment on the core insight would help a reviewer (and interviewer) follow along.");
  }
  if (codeLines.length > 60) {
    readability -= 10;
    suggestions.push("The solution is long — consider extracting a helper function.");
  }
  if (readability >= 90) strengths.push("Compact and easy to scan.");
  readability = clamp(readability);

  // ── Edge cases ───────────────────────────────────────────────────
  const guards = [
    /\.length\s*===?\s*0/, /\.length\s*<=?\s*1/, /!\s*\w+\s*\|\|/,
    /==\s*null/, /===\s*undefined/, /if\s*\(\s*!\w+\s*\)/,
    /Math\.(min|max)/, /return\s+\[\]/, /return\s+-1/,
  ];
  const guardHits = guards.filter((g) => g.test(code)).length;
  let edge = clamp(40 + guardHits * 18);
  if (ratio === 1) edge = clamp(edge + 15);
  if (guardHits === 0) {
    suggestions.push("No explicit guards for empty input or the not-found case. Interviewers ask about these first.");
  } else {
    strengths.push("Handles boundary conditions explicitly.");
  }

  const scores: ReviewScore[] = [
    { label: "Correctness", value: correctness, note: correctnessNote },
    { label: "Readability", value: readability, note: `${codeLines.length} code lines, ${commentLines.length} comment lines` },
    { label: "Optimization", value: optimization, note: hasNestedScan ? `Loop nesting depth ${depth}` : "No nested scans found" },
    { label: "Naming", value: naming, note: cryptic.length ? `${cryptic.length} cryptic name(s)` : "Names are descriptive" },
    { label: "Edge Cases", value: edge, note: `${guardHits} guard pattern(s) detected` },
  ];

  const overall = clamp(
    correctness * 0.4 + optimization * 0.25 + readability * 0.15 + naming * 0.1 + edge * 0.1,
  );

  if (suggestions.length === 0) {
    suggestions.push("Nothing structural to flag. Try the follow-up: can you cut the space complexity?");
  }

  return { scores, overall, suggestions, strengths };
}
