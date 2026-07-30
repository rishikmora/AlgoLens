import type { Problem } from "@/data/problems";

/**
 * AI Pair Programmer.
 *
 * Not a chatbot — it reads the code you are typing and points at a specific
 * line. Every observation is a pattern match against a real failure mode, so
 * it can name the line number and never invents a problem that isn't there.
 *
 * Deliberately conservative: staying quiet beats crying wolf while someone is
 * mid-thought, so nothing fires until the construct is actually complete.
 */

export type PairSeverity = "bug" | "warn" | "idea";

export interface PairNote {
  id: string;
  severity: PairSeverity;
  line: number;
  message: string;
}

const isBlank = (s: string) => !s.trim();

/** Strips strings and comments so patterns don't match inside them. */
function scrub(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length))
    .replace(/\/\/[^\n]*/g, (m) => " ".repeat(m.length))
    .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, (m) => `${m[0]}${" ".repeat(Math.max(0, m.length - 2))}${m[0]}`);
}

export function analyzePair(rawCode: string, problem?: Problem): PairNote[] {
  const code = scrub(rawCode);
  const lines = code.split("\n");
  const notes: PairNote[] = [];
  const push = (severity: PairSeverity, line: number, message: string, id: string) => {
    if (notes.some((n) => n.id === id)) return;
    notes.push({ id, severity, line, message });
  };

  const balanced = (code.match(/\{/g)?.length ?? 0) === (code.match(/\}/g)?.length ?? 0);

  // ── while loops that never advance ────────────────────────────────
  lines.forEach((line, idx) => {
    const m = line.match(/while\s*\(([^)]*)\)/);
    if (!m) return;
    const cond = m[1];
    const vars = [...cond.matchAll(/\b([a-zA-Z_$][\w$]*)\b/g)]
      .map((x) => x[1])
      .filter((v) => !["length", "true", "false", "null", "undefined"].includes(v));
    if (!vars.length) return;

    // Find the loop body by brace balance.
    let depth = 0, end = idx;
    for (let i = idx; i < lines.length; i++) {
      depth += (lines[i].match(/\{/g)?.length ?? 0) - (lines[i].match(/\}/g)?.length ?? 0);
      end = i;
      if (i > idx && depth <= 0) break;
      if (depth === 0 && i === idx && !lines[idx].includes("{")) break;
    }
    if (end <= idx) return;
    const body = lines.slice(idx, end + 1).join("\n");

    const advances = vars.some((v) =>
      new RegExp(`\\b${v}\\s*(\\+\\+|--|\\+=|-=|=[^=])`).test(body) ||
      new RegExp(`\\b${v}\\s*=\\s*\\w`).test(body),
    );
    const breaks = /\breturn\b|\bbreak\b/.test(body);
    if (!advances && !breaks) {
      push(
        "bug",
        idx + 1,
        `This \`while\` never changes ${vars.slice(0, 2).map((v) => `\`${v}\``).join(" or ")} and has no \`break\` — it will loop forever. You're missing the increment.`,
        "while-no-advance",
      );
    }
  });

  // ── assignment where a comparison was meant ───────────────────────
  lines.forEach((line, idx) => {
    if (/\b(if|while)\s*\([^)]*[^=!<>+\-*/]=[^=]/.test(line)) {
      push("bug", idx + 1, "Single `=` inside a condition assigns instead of comparing. Use `===`.", "assign-in-cond");
    }
  });

  // ── function with no return path ──────────────────────────────────
  if (problem && balanced && code.includes(problem.fn)) {
    const body = code.slice(code.indexOf(problem.fn));
    if (!/\breturn\b/.test(body) && body.split("\n").filter((l) => !isBlank(l)).length > 3) {
      push("warn", lines.findIndex((l) => l.includes(problem.fn)) + 1,
        `\`${problem.fn}\` never returns anything — every test will read \`undefined\`.`, "no-return");
    }
  }

  // ── off-by-one on the last index ──────────────────────────────────
  lines.forEach((line, idx) => {
    if (/for\s*\([^;]*;\s*\w+\s*<=\s*\w+\.length\s*;/.test(line)) {
      push("bug", idx + 1, "`i <= arr.length` walks one past the end. Use `<`.", "off-by-one");
    }
  });

  // ── mutating an array while iterating it ──────────────────────────
  lines.forEach((line, idx) => {
    if (/for\s*\([^)]*\.length[^)]*\)/.test(line)) {
      const rest = lines.slice(idx, idx + 8).join("\n");
      if (/\.(splice|shift|unshift)\s*\(/.test(rest)) {
        push("warn", idx + 1,
          "Removing elements while looping over the same array shifts the indices under you.", "mutate-while-iterate");
      }
    }
  });

  // ── shadowed loop counter ─────────────────────────────────────────
  const counters = [...code.matchAll(/for\s*\(\s*(?:let|var|const)\s+([a-zA-Z_$][\w$]*)/g)].map((m) => m[1]);
  const dupes = counters.filter((c, i) => counters.indexOf(c) !== i && c.length <= 2);
  if (dupes.length) {
    const line = lines.findIndex((l) => new RegExp(`for\\s*\\([^)]*\\b${dupes[0]}\\b`).test(l)) + 1;
    push("idea", Math.max(1, line),
      `Two loops both use \`${dupes[0]}\`. It works here, but distinct names make nested logic far easier to read.`,
      "shadowed-counter");
  }

  // ── problem-specific nudges ───────────────────────────────────────
  if (problem) {
    const topics = problem.topics.map((t) => t.toLowerCase()).join(" ");
    const loops = (code.match(/\b(for|while)\s*\(/g) ?? []).length;
    const usesLookup = /new Map\b|new Set\b|=\s*\{\s*\}/.test(code);
    const substantial = code.split("\n").filter((l) => !isBlank(l)).length >= 6;

    if (topics.includes("hash map") && loops >= 2 && !usesLookup && substantial) {
      push("idea", 1,
        "Two loops on a hash-map problem. What if you remembered what you had already seen instead of scanning again?",
        "suggest-map");
    }
    if (topics.includes("dynamic programming") && new RegExp(`\\b${problem.fn}\\s*\\(`).test(
      code.replace(new RegExp(`function\\s+${problem.fn}`), "")) && !/memo|cache|dp\b/i.test(code)) {
      push("idea", 1,
        "This recursion has no cache, so it recomputes the same states. Memoize it before the interviewer asks.",
        "suggest-memo");
    }
    if (topics.includes("binary search") && /\(\s*lo\s*\+\s*hi\s*\)\s*\/\s*2/.test(code)) {
      push("warn", lines.findIndex((l) => /\(\s*lo\s*\+\s*hi\s*\)/.test(l)) + 1,
        "`(lo + hi) / 2` can overflow in fixed-width languages. `lo + (hi - lo) / 2` is the habit to build.",
        "midpoint-overflow");
    }
    if (/\.sort\s*\(\s*\)/.test(code)) {
      push("warn", lines.findIndex((l) => /\.sort\s*\(\s*\)/.test(l)) + 1,
        "`.sort()` with no comparator sorts lexicographically — `[10, 9]` becomes `[10, 9]`. Pass `(a, b) => a - b`.",
        "sort-no-comparator");
    }
  }

  const rank: Record<PairSeverity, number> = { bug: 0, warn: 1, idea: 2 };
  return notes.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 4);
}

export const SEVERITY_LABEL: Record<PairSeverity, string> = {
  bug: "Likely bug",
  warn: "Careful",
  idea: "Idea",
};
