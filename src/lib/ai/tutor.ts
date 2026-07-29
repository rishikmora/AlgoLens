import type { Problem } from "@/data/problems";
import { reviewCode } from "./review";

export interface TutorContext {
  problem?: Problem;
  code?: string;
  hintLevel?: number;
}

export const QUICK_PROMPTS = [
  "Give me a hint",
  "Why is this O(n log n)?",
  "Explain recursion here",
  "Show a dry run",
  "Explain my mistake",
  "Give the optimized approach",
  "Can this be solved without a hashmap?",
  "Don't give the answer — just nudge me",
];

/**
 * Deterministic tutor used when no model key is configured.
 * It answers from the problem's own hints, editorial and the user's code,
 * so it stays correct rather than plausible-sounding.
 */
export function localTutor(question: string, ctx: TutorContext): string {
  const q = question.toLowerCase();
  const p = ctx.problem;

  const noSpoiler = /don'?t give|no spoiler|just nudge|hint only|without the answer/.test(q);

  // ── Progressive hints ────────────────────────────────────────────
  if (/hint|stuck|nudge|where do i start|how do i start/.test(q) || noSpoiler) {
    if (!p) return "Open a problem and I'll give you a graded hint — I start with a nudge and only escalate if you ask again.";
    const level = Math.min(ctx.hintLevel ?? 1, 4);
    const body = p.hints[level - 1];
    const header = [
      "**Hint 1 — a nudge**",
      "**Hint 2 — a direction**",
      "**Hint 3 — the tool to reach for**",
      "**Hint 4 — pseudocode**",
    ][level - 1];
    const footer =
      level < 4
        ? `\n\n_Ask again for hint ${level + 1} of 4._`
        : "\n\n_That's the last hint. Try writing it in your own words before you look at the editorial._";
    return `${header}\n\n${level === 4 ? "```\n" + body + "\n```" : body}${footer}`;
  }

  // ── Complexity ───────────────────────────────────────────────────
  if (/complexity|big.?o|o\(|time|space|why is this/.test(q)) {
    if (!p) return "Open a problem and ask again — I'll walk through its complexity term by term.";
    return (
      `**${p.title} — complexity**\n\n` +
      `Time: \`${p.editorial.time}\` · Space: \`${p.editorial.space}\`\n\n` +
      `${p.editorial.approach}\n\n` +
      `The way to say this in an interview: name the dominant operation, count how many times it runs, then state what dominates. ` +
      `Don't just announce the answer — show the counting.`
    );
  }

  // ── Recursion ────────────────────────────────────────────────────
  if (/recursion|recursive|base case|stack overflow|call stack/.test(q)) {
    return (
      "**Reading a recursive function**\n\n" +
      "1. **Base case** — the input so small the answer is obvious. Without it you recurse forever.\n" +
      "2. **Recursive case** — assume the function already works on a smaller input, and use that result.\n" +
      "3. **Progress** — every call must move strictly toward the base case.\n\n" +
      "Depth matters: each pending call holds a stack frame. Roughly 10⁴–10⁵ frames will overflow in most runtimes, " +
      "so linear recursion over a 10⁵-element array is risky — convert it to a loop or an explicit stack.\n\n" +
      "Open the **Debug** tab and step through: the call stack panel shows frames pushing and popping live."
    );
  }

  // ── Dry run ──────────────────────────────────────────────────────
  if (/dry run|trace|walk through|step through|example/.test(q)) {
    if (!p) return "Open a problem first and I'll trace it against the sample input.";
    const ex = p.examples[0];
    return (
      `**Dry run — ${p.title}**\n\n` +
      `Input: \`${ex.input}\` → expected \`${ex.output}\`\n\n` +
      (ex.explanation ? `${ex.explanation}\n\n` : "") +
      `${p.editorial.approach}\n\n` +
      (p.viz
        ? `Open the **Visualize** tab to watch this execute frame by frame, with the pseudocode line highlighted at each step.`
        : `Paste your solution into the **Debug** tab to step through it line by line.`)
    );
  }

  // ── Mistake analysis ─────────────────────────────────────────────
  if (/mistake|wrong|bug|failing|why.*fail|what'?s wrong/.test(q)) {
    if (!ctx.code?.trim()) return "Write some code first and I'll review it against the common failure modes for this problem.";
    const r = reviewCode(ctx.code, { passed: 0, total: 0, verdict: "Unknown" });
    const items = r.suggestions.slice(0, 4).map((s) => `- ${s}`).join("\n");
    return (
      `**What I can see in your code**\n\n${items}\n\n` +
      (p
        ? `For **${p.title}** specifically, the cases people miss are: ${p.constraints[p.constraints.length - 1]}. ` +
          `Run the failing test in the Test Cases panel and compare against the expected output.`
        : "Run the tests and tell me which case fails — I can be much more specific then.")
    );
  }

  // ── Optimisation ─────────────────────────────────────────────────
  if (/optim|faster|improve|better approach|reduce/.test(q)) {
    if (!p) return "Open a problem and I'll contrast the brute force with the intended solution.";
    return (
      `**Optimized approach — ${p.title}**\n\n${p.editorial.approach}\n\n` +
      `Target: \`${p.editorial.time}\` time, \`${p.editorial.space}\` space.\n\n` +
      `Before you look at code: state the invariant your loop maintains. If you can say it in one sentence, ` +
      `the implementation usually falls out.`
    );
  }

  // ── Alternative data structures ──────────────────────────────────
  if (/without|instead of|alternative|other way|can this be solved/.test(q)) {
    if (/hash|map|dict/.test(q)) {
      return (
        "**Without a hash map**\n\n" +
        "Two common substitutes:\n\n" +
        "- **Sort first, then two pointers.** Costs O(n log n) time but drops to O(1) extra space. " +
        "The catch: sorting destroys the original indices, so if the answer is *indices* you must store them before sorting.\n" +
        "- **Bounded values → use an array as the map.** If values fit in a known small range, a plain array indexed by value is a faster hash map with no hashing overhead.\n\n" +
        "In an interview, offering this trade-off unprompted is a strong signal — it shows you know *why* you picked the hash map."
      );
    }
    return (
      "There is almost always a time/space trade-off available. The three levers worth naming out loud:\n\n" +
      "1. **Sort** — buy ordering for O(n log n), then exploit it with two pointers or binary search.\n" +
      "2. **Precompute** — prefix sums, suffix maxima, or a frequency table turn repeated work into a lookup.\n" +
      "3. **Change the traversal** — iterative instead of recursive, or BFS instead of DFS, changes the space profile.\n\n" +
      "Which one applies depends on what the problem lets you destroy. Tell me the constraint you are fighting and I'll narrow it down."
    );
  }

  // ── Fallback ─────────────────────────────────────────────────────
  if (p) {
    return (
      `We're on **${p.title}** (${p.difficulty}, topics: ${p.topics.join(", ")}).\n\n` +
      `I can give you a graded hint, explain the complexity, dry-run the example, review your code for mistakes, ` +
      `or contrast approaches. Which would help most right now?\n\n` +
      `_Tip: ask for a hint and I'll start with the smallest possible nudge rather than the answer._`
    );
  }
  return (
    "I'm your tutor for this session. Open a problem and I can give graded hints, explain complexity, " +
    "dry-run an example, or review your code. What are you working on?"
  );
}
