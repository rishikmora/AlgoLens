import type { Problem } from "@/data/problems";

/**
 * Heuristic code review.
 *
 * Every score is derived from something measurable in the submitted source and,
 * where a problem is supplied, from how the submission compares to that
 * problem's intended approach and target complexity. Nothing here calls a
 * model, so results are reproducible.
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
  /** A concrete different way to solve *this* problem, with its trade-off. */
  alternative?: { title: string; body: string };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Rough loop nesting depth, tracked by brace balance between loop keywords. */
function maxLoopDepth(code: string): number {
  let depth = 0, max = 0, brace = 0;
  const loopBraces: number[] = [];
  const tokens = code.split(/(\{|\}|\bfor\b|\bwhile\b)/);
  let pendingLoop = false;

  for (const t of tokens) {
    if (t === "for" || t === "while") pendingLoop = true;
    else if (t === "{") {
      brace++;
      if (pendingLoop) { loopBraces.push(brace); depth++; max = Math.max(max, depth); pendingLoop = false; }
    } else if (t === "}") {
      if (loopBraces.length && loopBraces[loopBraces.length - 1] === brace) { loopBraces.pop(); depth--; }
      brace--;
    }
  }
  if (max === 0) {
    const loops = code.match(/\b(for|while)\s*\(/g)?.length ?? 0;
    return Math.min(loops, 1);
  }
  return max;
}

/* ── Problem-specific analysis ────────────────────────────────────── */

interface Structures {
  usesMap: boolean;
  usesSet: boolean;
  usesObjectMap: boolean;
  usesSort: boolean;
  usesRecursion: boolean;
  usesMemo: boolean;
  usesDpArray: boolean;
  usesTwoPointers: boolean;
  usesQueue: boolean;
  usesStack: boolean;
}

function detectStructures(code: string, fn: string): Structures {
  return {
    usesMap: /new Map\b|\{\s*\}\s*;?\s*\/\/\s*map/i.test(code),
    usesSet: /new Set\b/.test(code),
    usesObjectMap: /=\s*\{\s*\}/.test(code),
    usesSort: /\.sort\s*\(/.test(code),
    usesRecursion: new RegExp(`\\b${fn}\\s*\\(`, "g").test(code.replace(new RegExp(`function\\s+${fn}`), "")),
    usesMemo: /memo|cache|seen\s*\[|dp\s*\[/i.test(code),
    usesDpArray: /\bdp\b|new Array\(|\.fill\(/.test(code),
    usesTwoPointers: /(left|lo|start).*(right|hi|end)/is.test(code),
    usesQueue: /\.shift\s*\(|queue/i.test(code),
    usesStack: /\.push\s*\(.*\.pop\s*\(|stack/is.test(code),
  };
}

/** Names a genuinely different approach for this problem, plus the trade-off. */
function alternativeFor(
  problem: Problem,
  st: Structures,
  depth: number,
): { title: string; body: string } {
  const topics = problem.topics.map((t) => t.toLowerCase());
  const has = (t: string) => topics.some((x) => x.includes(t));

  if (has("hash map") && (st.usesMap || st.usesSet || st.usesObjectMap)) {
    return {
      title: "Sort, then two pointers",
      body:
        `You traded space for time with a hash map — ${problem.editorial.time} time, ${problem.editorial.space} space. ` +
        "The alternative is to sort first and walk two pointers inward: O(n log n) time but O(1) extra space. " +
        "The catch on this problem is that sorting destroys the original indices, so capture them before you sort. " +
        "Naming this trade-off unprompted is a strong interview signal.",
    };
  }
  if (has("hash map") && depth >= 2) {
    return {
      title: "Replace the inner scan with a hash map",
      body:
        `Your nested loops are O(n²). For each element you already know what you need — ` +
        `store what you have seen in a Map as you go and the inner loop disappears, giving ${problem.editorial.time}.`,
    };
  }
  if (has("dynamic programming") && st.usesRecursion && !st.usesMemo) {
    return {
      title: "Memoize, or go bottom-up",
      body:
        "Plain recursion recomputes the same subproblems exponentially. Cache results by state for top-down " +
        `memoization, or fill a table iteratively for ${problem.editorial.time} — the bottom-up version also ` +
        "avoids any risk of blowing the call stack.",
    };
  }
  if (has("dynamic programming") && st.usesDpArray) {
    return {
      title: "Collapse the DP table",
      body:
        "Your recurrence only reaches back a fixed number of states, so the full array is unnecessary. " +
        "Keep just those few values and space drops to O(1) with identical time. Interviewers ask for this " +
        "almost every time DP comes up.",
    };
  }
  if (has("binary search")) {
    return {
      title: "Watch the boundary form",
      body:
        "The alternative framing is a half-open interval [lo, hi) with `while (lo < hi)`, which removes the " +
        "±1 juggling that causes most binary-search bugs. Also prefer `lo + (hi - lo) / 2` over `(lo + hi) / 2` " +
        "in languages where the sum can overflow.",
    };
  }
  if (has("graph") || has("bfs") || has("dfs")) {
    return {
      title: st.usesQueue ? "DFS, or union-find" : "BFS instead of DFS",
      body: st.usesQueue
        ? "BFS uses O(width) memory; recursive DFS uses O(depth) and is shorter to write, but can overflow on a " +
          "large grid. For pure connectivity counting, union-find is a third option that also handles incremental edges."
        : "DFS recursion risks stack overflow at scale. An explicit queue (BFS) bounds memory by the frontier width " +
          "and is what you want if the question ever turns into shortest path.",
    };
  }
  if (has("stack")) {
    return {
      title: "Counter instead of a stack",
      body:
        "If there were only one bracket type, a single integer counter would replace the stack entirely at O(1) space. " +
        "The stack is only necessary because you must remember *which* kind of bracket is open.",
    };
  }
  if (has("sliding window")) {
    return {
      title: "Fixed-size array instead of a map",
      body:
        "When the alphabet is bounded, a 128-element array indexed by char code replaces the hash map — same " +
        "complexity, meaningfully faster in practice, and no hashing overhead.",
    };
  }
  return {
    title: "The other axis",
    body:
      `The intended solution runs in ${problem.editorial.time} with ${problem.editorial.space} space. ` +
      "If you matched the time bound, the usual follow-up is whether you can cut the space; if you matched " +
      "space, whether precomputation buys you time.",
  };
}

/* ── Main ─────────────────────────────────────────────────────────── */

export function reviewCode(
  code: string,
  opts: { passed: number; total: number; verdict: string },
  problem?: Problem,
): CodeReview {
  const lines = code.split("\n");
  const codeLines = lines.filter((l) => l.trim() && !l.trim().startsWith("//"));
  const commentLines = lines.filter((l) => /^\s*(\/\/|#|\/\*)/.test(l));
  const suggestions: string[] = [];
  const strengths: string[] = [];

  const depth = maxLoopDepth(code);
  const st = detectStructures(code, problem?.fn ?? "solve");

  // ── Correctness ──────────────────────────────────────────────────
  const ratio = opts.total > 0 ? opts.passed / opts.total : 0;
  const notRun = opts.verdict === "Needs Sandbox";
  const correctness = notRun ? 0 : clamp(ratio * 100);
  const correctnessNote = notRun
    ? "Not executed — no sandbox for this language"
    : ratio === 1
      ? `All ${opts.total} test cases passed`
      : `${opts.passed}/${opts.total} test cases passed`;

  if (ratio === 1) strengths.push("Passes every test case, including the edge cases.");
  else if (opts.total > 0 && !notRun) {
    suggestions.push(`Fix the ${opts.total - opts.passed} failing case(s) before optimising anything else.`);
  }

  // ── Performance (problem-aware) ──────────────────────────────────
  const linearInLoop = /for\s*\([^)]*\)[\s\S]{0,220}?\.(indexOf|includes|find)\s*\(/.test(code);
  let performance = 100;
  let perfNote = depth >= 2 ? `Loop nesting depth ${depth}` : "No nested scans found";

  if (depth >= 2) {
    performance -= 35;
    suggestions.push(
      problem
        ? `Nested loops make this ~O(n²), but ${problem.title} is solvable in ${problem.editorial.time}.`
        : "Nested loops detected — this looks quadratic. A hash map or two pointers often collapses it to O(n).",
    );
  }
  if (linearInLoop) {
    performance -= 20;
    suggestions.push("`indexOf`/`includes` inside a loop is a hidden inner scan. Use a Set or Map for O(1) membership.");
  }
  if (problem?.topics.some((t) => t.toLowerCase().includes("dynamic")) && st.usesRecursion && !st.usesMemo) {
    performance -= 30;
    perfNote = "Unmemoized recursion on a DP problem";
    suggestions.push("This recursion recomputes subproblems — memoize it or rewrite bottom-up.");
  }
  if (depth < 2 && !linearInLoop) strengths.push("Single-pass structure — no hidden quadratic scans.");
  performance = clamp(performance);

  // ── Maintainability ──────────────────────────────────────────────
  const longestFn = Math.max(
    ...code.split(/\bfunction\b/).map((c) => c.split("\n").length),
    codeLines.length,
  );
  const magicNumbers = (code.match(/[^\w.]-?\d{2,}/g) ?? []).filter((m) => !/[01]$/.test(m)).length;
  let maintainability = 100;
  let maintNote = `Deepest nesting ${depth}, ${codeLines.length} code lines`;

  if (depth >= 3) {
    maintainability -= 22;
    suggestions.push("Three levels of nesting is hard to hold in your head — extract the inner loop into a helper.");
  }
  if (longestFn > 45) {
    maintainability -= 18;
    suggestions.push("This function is long enough that a reviewer has to scroll. Split out one named step.");
  }
  if (magicNumbers > 2) {
    maintainability -= 12;
    maintNote += `, ${magicNumbers} magic numbers`;
    suggestions.push("Give the literal constants names so the intent survives without you in the room.");
  }
  if (/\bvar\b/.test(code)) {
    maintainability -= 10;
    suggestions.push("Prefer `let`/`const` over `var` — block scoping prevents a class of loop-capture bugs.");
  }
  if (maintainability >= 90) strengths.push("Flat, short, and easy to modify.");
  maintainability = clamp(maintainability);

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
  if (readability >= 90) strengths.push("Compact and easy to scan.");
  readability = clamp(readability);

  // ── Naming ───────────────────────────────────────────────────────
  const declared = [...code.matchAll(/\b(?:let|const|var)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  const loopCounters = new Set(["i", "j", "k", "n", "m"]);
  const cryptic = declared.filter((v) => v.length <= 2 && !loopCounters.has(v));
  let naming = 100 - cryptic.length * 12;
  if (cryptic.length > 0) {
    suggestions.push(
      `Rename short variables (${cryptic.slice(0, 3).map((c) => `\`${c}\``).join(", ")}) to something that states intent.`,
    );
  } else if (declared.length > 0) strengths.push("Variable names read clearly.");
  naming = clamp(naming);

  // ── Edge cases (problem-aware) ───────────────────────────────────
  const guards = [
    /\.length\s*===?\s*0/, /\.length\s*<=?\s*1/, /!\s*\w+\s*\|\|/,
    /==\s*null/, /===\s*undefined/, /if\s*\(\s*!\w+\s*\)/,
    /Math\.(min|max)/, /return\s+\[\]/, /return\s+-1/, /return\s+false/,
  ];
  const guardHits = guards.filter((g) => g.test(code)).length;
  let edge = clamp(40 + guardHits * 18);
  if (ratio === 1) edge = clamp(edge + 15);

  if (guardHits === 0) {
    suggestions.push("No explicit guards for empty input or the not-found case. Interviewers ask about these first.");
  } else strengths.push("Handles boundary conditions explicitly.");

  if (problem) {
    const lastConstraint = problem.constraints[problem.constraints.length - 1];
    if (/duplicate/i.test(problem.constraints.join(" ")) && !/dup/i.test(code)) {
      suggestions.push("This problem's constraints mention duplicates — say out loud how your solution handles them.");
    }
    if (/negative|-10\^|-5 \*/.test(problem.constraints.join(" ")) && !/<\s*0|negative|Math\.abs/.test(code)) {
      suggestions.push(`Inputs can be negative (${lastConstraint}). Confirm your comparisons still hold.`);
    }
  }

  const scores: ReviewScore[] = [
    { label: "Correctness", value: correctness, note: correctnessNote },
    { label: "Performance", value: performance, note: perfNote },
    { label: "Readability", value: readability, note: `${codeLines.length} code lines, ${commentLines.length} comment lines` },
    { label: "Maintainability", value: maintainability, note: maintNote },
    { label: "Naming", value: naming, note: cryptic.length ? `${cryptic.length} cryptic name(s)` : "Names are descriptive" },
    { label: "Edge Cases", value: edge, note: `${guardHits} guard pattern(s) detected` },
  ];

  const overall = clamp(
    correctness * 0.34 + performance * 0.22 + maintainability * 0.14 +
    readability * 0.12 + naming * 0.08 + edge * 0.10,
  );

  if (suggestions.length === 0) {
    suggestions.push("Nothing structural to flag. Try the follow-up in Alternative approach.");
  }

  return {
    scores,
    overall,
    suggestions,
    strengths,
    alternative: problem ? alternativeFor(problem, st, depth) : undefined,
  };
}
