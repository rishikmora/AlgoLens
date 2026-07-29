/**
 * Trace generators for the visualizer.
 *
 * Each algorithm runs to completion up-front and records a frame per meaningful
 * event. The player then scrubs through frames — which is what makes stepping
 * backwards and replaying free.
 */

export type RenderKind = "bars" | "graph" | "table" | "stack";

export interface VizFrame {
  label: string;
  /** Coarse stage name, shown in the replay strip: Split → Merge → Compare → Swap → Sorted. */
  phase: string;
  /** Index into the algorithm's pseudocode, for line highlighting. */
  line: number;
  array?: number[];
  compare?: number[];
  write?: number[];
  done?: number[];
  range?: [number, number];
  pointers?: Record<string, number>;
  vars?: Record<string, string | number | boolean>;
  stack?: string[];
  table?: (number | string)[][];
  tableCell?: [number, number];
  graph?: { visited: number[]; frontier: number[]; current: number | null };
  comparisons: number;
  swaps: number;
  ops: number;
}

export interface VizAlgo {
  id: string;
  name: string;
  category: "Sorting" | "Searching" | "Graph" | "Dynamic Programming" | "Sliding Window" | "Stack";
  render: RenderKind;
  time: string;
  space: string;
  blurb: string;
  pseudo: string[];
  run: (input: number[]) => VizFrame[];
}

/** Accumulates frames and keeps the running counters in one place. */
class Recorder {
  frames: VizFrame[] = [];
  comparisons = 0;
  swaps = 0;
  ops = 0;

  push(f: Omit<VizFrame, "comparisons" | "swaps" | "ops">) {
    this.ops++;
    this.frames.push({
      ...f,
      comparisons: this.comparisons,
      swaps: this.swaps,
      ops: this.ops,
    });
  }

  cmp() { this.comparisons++; }
  swap() { this.swaps++; }
}

export const DEMO_GRAPH = {
  nodes: [
    { id: 0, x: 50, y: 18 }, { id: 1, x: 22, y: 38 }, { id: 2, x: 78, y: 38 },
    { id: 3, x: 10, y: 64 }, { id: 4, x: 38, y: 64 }, { id: 5, x: 64, y: 64 },
    { id: 6, x: 90, y: 64 }, { id: 7, x: 50, y: 88 },
  ],
  edges: [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [4, 7], [5, 7],
  ] as [number, number][],
};

const adjacency = (() => {
  const adj: number[][] = DEMO_GRAPH.nodes.map(() => []);
  for (const [a, b] of DEMO_GRAPH.edges) { adj[a].push(b); adj[b].push(a); }
  return adj.map((l) => l.sort((x, y) => x - y));
})();

// ─── Sorting ─────────────────────────────────────────────────────────

function bubbleSort(input: number[]): VizFrame[] {
  const a = [...input];
  const r = new Recorder();
  const done: number[] = [];
  r.push({ label: "Start", phase: "Init", line: 0, array: [...a] });

  for (let i = 0; i < a.length - 1; i++) {
    r.push({ label: `Pass ${i + 1}`, phase: "Pass", line: 1, array: [...a], done: [...done], vars: { i } });
    for (let j = 0; j < a.length - i - 1; j++) {
      r.cmp();
      r.push({
        label: `Compare ${a[j]} and ${a[j + 1]}`, phase: "Compare", line: 2,
        array: [...a], compare: [j, j + 1], done: [...done], vars: { i, j },
      });
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        r.swap();
        r.push({
          label: `Swap → ${a[j]} before ${a[j + 1]}`, phase: "Swap", line: 3,
          array: [...a], write: [j, j + 1], done: [...done], vars: { i, j },
        });
      }
    }
    done.push(a.length - i - 1);
  }
  done.push(0);
  r.push({ label: "Sorted", phase: "Sorted", line: 4, array: [...a], done: a.map((_, i) => i) });
  return r.frames;
}

function insertionSort(input: number[]): VizFrame[] {
  const a = [...input];
  const r = new Recorder();
  r.push({ label: "Start", phase: "Init", line: 0, array: [...a], done: [0] });

  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    r.push({
      label: `Take ${key} as the key`, phase: "Select", line: 1,
      array: [...a], compare: [i], done: Array.from({ length: i }, (_, k) => k), vars: { i, key },
    });
    while (j >= 0 && a[j] > key) {
      r.cmp();
      a[j + 1] = a[j];
      r.swap();
      r.push({
        label: `${a[j]} > ${key}, shift right`, phase: "Shift", line: 3,
        array: [...a], write: [j + 1], compare: [j], vars: { i, j, key },
      });
      j--;
    }
    a[j + 1] = key;
    r.push({
      label: `Insert ${key} at index ${j + 1}`, phase: "Insert", line: 4,
      array: [...a], write: [j + 1], done: Array.from({ length: i + 1 }, (_, k) => k), vars: { i, key },
    });
  }
  r.push({ label: "Sorted", phase: "Sorted", line: 5, array: [...a], done: a.map((_, i) => i) });
  return r.frames;
}

function mergeSort(input: number[]): VizFrame[] {
  const a = [...input];
  const r = new Recorder();
  r.push({ label: "Start", phase: "Init", line: 0, array: [...a] });

  const sort = (lo: number, hi: number, depth: number) => {
    if (hi - lo <= 1) return;
    const mid = (lo + hi) >> 1;
    r.push({
      label: `Split [${lo}, ${hi}) at ${mid}`, phase: "Split", line: 2,
      array: [...a], range: [lo, hi - 1], vars: { lo, mid, hi, depth },
    });
    sort(lo, mid, depth + 1);
    sort(mid, hi, depth + 1);

    const left = a.slice(lo, mid);
    const right = a.slice(mid, hi);
    let i = 0, j = 0, k = lo;
    r.push({
      label: `Merge [${lo}, ${mid}) with [${mid}, ${hi})`, phase: "Merge", line: 5,
      array: [...a], range: [lo, hi - 1], vars: { lo, mid, hi },
    });

    while (i < left.length && j < right.length) {
      r.cmp();
      r.push({
        label: `Compare ${left[i]} and ${right[j]}`, phase: "Compare", line: 6,
        array: [...a], compare: [lo + i, mid + j], range: [lo, hi - 1],
        vars: { left: left[i], right: right[j] },
      });
      a[k] = left[i] <= right[j] ? left[i++] : right[j++];
      r.swap();
      r.push({
        label: `Write ${a[k]} at index ${k}`, phase: "Merge", line: 7,
        array: [...a], write: [k], range: [lo, hi - 1],
      });
      k++;
    }
    while (i < left.length) {
      a[k] = left[i++];
      r.push({ label: `Drain left → ${a[k]}`, phase: "Merge", line: 8, array: [...a], write: [k], range: [lo, hi - 1] });
      k++;
    }
    while (j < right.length) {
      a[k] = right[j++];
      r.push({ label: `Drain right → ${a[k]}`, phase: "Merge", line: 9, array: [...a], write: [k], range: [lo, hi - 1] });
      k++;
    }
    r.push({
      label: `[${lo}, ${hi}) is now sorted`, phase: "Merged", line: 10,
      array: [...a], done: Array.from({ length: hi - lo }, (_, x) => lo + x), range: [lo, hi - 1],
    });
  };

  sort(0, a.length, 0);
  r.push({ label: "Sorted", phase: "Sorted", line: 11, array: [...a], done: a.map((_, i) => i) });
  return r.frames;
}

function quickSort(input: number[]): VizFrame[] {
  const a = [...input];
  const r = new Recorder();
  const done: number[] = [];
  r.push({ label: "Start", phase: "Init", line: 0, array: [...a] });

  const part = (lo: number, hi: number) => {
    const pivot = a[hi];
    r.push({
      label: `Pivot = ${pivot} (index ${hi})`, phase: "Pivot", line: 2,
      array: [...a], compare: [hi], range: [lo, hi], done: [...done], vars: { lo, hi, pivot },
    });
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      r.cmp();
      r.push({
        label: `Is ${a[j]} <= ${pivot}?`, phase: "Compare", line: 4,
        array: [...a], compare: [j, hi], range: [lo, hi], done: [...done], vars: { i, j, pivot },
      });
      if (a[j] <= pivot) {
        i++;
        if (i !== j) {
          [a[i], a[j]] = [a[j], a[i]];
          r.swap();
          r.push({
            label: `Swap ${a[j]} and ${a[i]}`, phase: "Swap", line: 5,
            array: [...a], write: [i, j], range: [lo, hi], done: [...done],
          });
        }
      }
    }
    [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
    r.swap();
    r.push({
      label: `Place pivot at index ${i + 1}`, phase: "Partition", line: 6,
      array: [...a], write: [i + 1], range: [lo, hi], done: [...done],
    });
    done.push(i + 1);
    return i + 1;
  };

  const sort = (lo: number, hi: number) => {
    if (lo >= hi) {
      if (lo === hi) done.push(lo);
      return;
    }
    const p = part(lo, hi);
    sort(lo, p - 1);
    sort(p + 1, hi);
  };

  sort(0, a.length - 1);
  r.push({ label: "Sorted", phase: "Sorted", line: 8, array: [...a], done: a.map((_, i) => i) });
  return r.frames;
}

// ─── Searching / arrays ──────────────────────────────────────────────

function binarySearch(input: number[]): VizFrame[] {
  const a = [...input].sort((x, y) => x - y);
  const target = a[Math.floor(a.length * 0.7)];
  const r = new Recorder();
  let lo = 0, hi = a.length - 1;

  r.push({ label: `Searching for ${target}`, phase: "Init", line: 0, array: [...a], range: [lo, hi], vars: { target } });

  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    r.push({
      label: `mid = ${mid}, value ${a[mid]}`, phase: "Probe", line: 2,
      array: [...a], compare: [mid], range: [lo, hi], pointers: { lo, mid, hi }, vars: { lo, mid, hi, target },
    });
    r.cmp();
    if (a[mid] === target) {
      r.push({
        label: `Found ${target} at index ${mid}`, phase: "Found", line: 3,
        array: [...a], write: [mid], done: [mid], pointers: { lo, mid, hi }, vars: { target, found: mid },
      });
      return r.frames;
    }
    if (a[mid] < target) {
      lo = mid + 1;
      r.push({
        label: `${a[mid]} < ${target} → discard the left half`, phase: "Discard", line: 4,
        array: [...a], range: [lo, hi], pointers: { lo, hi }, vars: { lo, hi },
      });
    } else {
      hi = mid - 1;
      r.push({
        label: `${a[mid]} > ${target} → discard the right half`, phase: "Discard", line: 5,
        array: [...a], range: [lo, hi], pointers: { lo, hi }, vars: { lo, hi },
      });
    }
  }
  r.push({ label: "Not found", phase: "Done", line: 6, array: [...a] });
  return r.frames;
}

function twoSum(input: number[]): VizFrame[] {
  const a = [...input];
  const target = a[0] + a[a.length - 2];
  const r = new Recorder();
  const seen = new Map<number, number>();

  r.push({ label: `target = ${target}`, phase: "Init", line: 0, array: [...a], vars: { target } });

  for (let i = 0; i < a.length; i++) {
    const need = target - a[i];
    r.cmp();
    r.push({
      label: `At ${a[i]}, need ${need}`, phase: "Scan", line: 2,
      array: [...a], compare: [i], vars: { i, value: a[i], need, map: `{${[...seen.keys()].join(", ")}}` },
    });
    if (seen.has(need)) {
      r.push({
        label: `Found: indices ${seen.get(need)} and ${i}`, phase: "Found", line: 3,
        array: [...a], done: [seen.get(need)!, i], write: [seen.get(need)!, i],
        vars: { answer: `[${seen.get(need)}, ${i}]` },
      });
      return r.frames;
    }
    seen.set(a[i], i);
    r.push({
      label: `Store ${a[i]} → index ${i}`, phase: "Store", line: 4,
      array: [...a], write: [i], vars: { map: `{${[...seen.keys()].join(", ")}}` },
    });
  }
  r.push({ label: "No pair found", phase: "Done", line: 5, array: [...a] });
  return r.frames;
}

function kadane(input: number[]): VizFrame[] {
  const a = input.map((x, i) => (i % 3 === 1 ? -x : x));
  const r = new Recorder();
  let cur = a[0], best = a[0], bestStart = 0, bestEnd = 0, curStart = 0;

  r.push({ label: `cur = best = ${a[0]}`, phase: "Init", line: 0, array: [...a], compare: [0], vars: { cur, best } });

  for (let i = 1; i < a.length; i++) {
    r.cmp();
    if (a[i] > cur + a[i]) {
      cur = a[i];
      curStart = i;
      r.push({
        label: `Restart at ${a[i]} — the prefix was dragging us down`, phase: "Restart", line: 2,
        array: [...a], compare: [i], vars: { i, cur, best },
      });
    } else {
      cur = cur + a[i];
      r.push({
        label: `Extend: cur = ${cur}`, phase: "Extend", line: 3,
        array: [...a], compare: [i], range: [curStart, i], vars: { i, cur, best },
      });
    }
    if (cur > best) {
      best = cur;
      bestStart = curStart;
      bestEnd = i;
      r.swap();
      r.push({
        label: `New best = ${best}`, phase: "Best", line: 4,
        array: [...a], range: [bestStart, bestEnd], write: [i], vars: { i, cur, best },
      });
    }
  }
  r.push({
    label: `Answer: ${best}`, phase: "Done", line: 5, array: [...a],
    done: Array.from({ length: bestEnd - bestStart + 1 }, (_, k) => bestStart + k),
    vars: { best },
  });
  return r.frames;
}

function slidingWindow(input: number[]): VizFrame[] {
  // Map numbers onto a small alphabet so repeats actually happen.
  const s = input.map((n) => String.fromCharCode(97 + (n % 6)));
  const r = new Recorder();
  const last = new Map<string, number>();
  let left = 0, best = 0, bestL = 0, bestR = 0;

  r.push({ label: `String: ${s.join("")}`, phase: "Init", line: 0, array: input, vars: { s: s.join("") } });

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    r.cmp();
    if (last.has(c) && last.get(c)! >= left) {
      left = last.get(c)! + 1;
      r.push({
        label: `'${c}' repeats — move left to ${left}`, phase: "Shrink", line: 2,
        array: input, compare: [right], range: [left, right], pointers: { left, right }, vars: { c, left, right },
      });
    }
    last.set(c, right);
    if (right - left + 1 > best) {
      best = right - left + 1;
      bestL = left;
      bestR = right;
      r.swap();
    }
    r.push({
      label: `Window "${s.slice(left, right + 1).join("")}" — length ${right - left + 1}`, phase: "Grow", line: 4,
      array: input, range: [left, right], write: [right], pointers: { left, right },
      vars: { window: s.slice(left, right + 1).join(""), best },
    });
  }
  r.push({
    label: `Longest = ${best} ("${s.slice(bestL, bestR + 1).join("")}")`, phase: "Done", line: 5,
    array: input, done: Array.from({ length: bestR - bestL + 1 }, (_, k) => bestL + k), vars: { best },
  });
  return r.frames;
}

// ─── Graph ───────────────────────────────────────────────────────────

function bfs(): VizFrame[] {
  const r = new Recorder();
  const visited: number[] = [];
  const queue = [0];

  r.push({ label: "Enqueue start node 0", phase: "Init", line: 0, graph: { visited: [], frontier: [...queue], current: null }, stack: ["0"] });

  while (queue.length) {
    const node = queue.shift()!;
    if (visited.includes(node)) continue;
    visited.push(node);
    r.cmp();
    r.push({
      label: `Visit node ${node}`, phase: "Visit", line: 2,
      graph: { visited: [...visited], frontier: [...queue], current: node },
      stack: queue.map(String), vars: { node, queue: `[${queue.join(", ")}]` },
    });

    for (const nb of adjacency[node]) {
      if (!visited.includes(nb) && !queue.includes(nb)) {
        queue.push(nb);
        r.swap();
        r.push({
          label: `Enqueue neighbour ${nb}`, phase: "Enqueue", line: 4,
          graph: { visited: [...visited], frontier: [...queue], current: node },
          stack: queue.map(String), vars: { node, neighbour: nb, queue: `[${queue.join(", ")}]` },
        });
      }
    }
  }
  r.push({
    label: `Traversal order: ${visited.join(" → ")}`, phase: "Done", line: 5,
    graph: { visited: [...visited], frontier: [], current: null }, vars: { order: visited.join(" → ") },
  });
  return r.frames;
}

function dfs(): VizFrame[] {
  const r = new Recorder();
  const visited: number[] = [];
  const stack = [0];

  r.push({ label: "Push start node 0", phase: "Init", line: 0, graph: { visited: [], frontier: [...stack], current: null }, stack: ["0"] });

  while (stack.length) {
    const node = stack.pop()!;
    if (visited.includes(node)) continue;
    visited.push(node);
    r.cmp();
    r.push({
      label: `Visit node ${node}`, phase: "Visit", line: 2,
      graph: { visited: [...visited], frontier: [...stack], current: node },
      stack: stack.map(String), vars: { node, stack: `[${stack.join(", ")}]` },
    });

    for (const nb of [...adjacency[node]].reverse()) {
      if (!visited.includes(nb)) {
        stack.push(nb);
        r.swap();
        r.push({
          label: `Push neighbour ${nb}`, phase: "Push", line: 4,
          graph: { visited: [...visited], frontier: [...stack], current: node },
          stack: stack.map(String), vars: { node, neighbour: nb, stack: `[${stack.join(", ")}]` },
        });
      }
    }
  }
  r.push({
    label: `Traversal order: ${visited.join(" → ")}`, phase: "Done", line: 5,
    graph: { visited: [...visited], frontier: [], current: null }, vars: { order: visited.join(" → ") },
  });
  return r.frames;
}

// ─── Dynamic programming ─────────────────────────────────────────────

function coinChange(input: number[]): VizFrame[] {
  const coins = [1, 3, 4];
  const amount = Math.max(6, Math.min(12, input.length + 4));
  const r = new Recorder();
  const INF = Infinity;
  const dp: (number | string)[] = new Array(amount + 1).fill("∞");
  dp[0] = 0;

  const asTable = () => [dp.map((v) => v)];

  r.push({
    label: `dp[0] = 0, everything else ∞`, phase: "Init", line: 0,
    table: asTable(), tableCell: [0, 0], vars: { coins: `[${coins.join(", ")}]`, amount },
  });

  for (let x = 1; x <= amount; x++) {
    for (const c of coins) {
      if (c > x) continue;
      r.cmp();
      const prev = dp[x - c];
      const candidate = typeof prev === "number" ? prev + 1 : INF;
      const current = typeof dp[x] === "number" ? (dp[x] as number) : INF;
      r.push({
        label: `dp[${x}] via coin ${c}: dp[${x - c}] + 1 = ${candidate === INF ? "∞" : candidate}`,
        phase: "Consider", line: 3, table: asTable(), tableCell: [0, x],
        vars: { x, coin: c, from: `dp[${x - c}]=${prev}`, best: dp[x] },
      });
      if (candidate < current) {
        dp[x] = candidate;
        r.swap();
        r.push({
          label: `Improve dp[${x}] → ${candidate}`, phase: "Update", line: 4,
          table: asTable(), tableCell: [0, x], vars: { x, coin: c, best: dp[x] },
        });
      }
    }
  }
  r.push({
    label: `Fewest coins for ${amount} = ${dp[amount]}`, phase: "Done", line: 5,
    table: asTable(), tableCell: [0, amount], vars: { answer: dp[amount] },
  });
  return r.frames;
}

function fib(input: number[]): VizFrame[] {
  const n = Math.max(6, Math.min(14, input.length + 3));
  const r = new Recorder();
  const dp: (number | string)[] = new Array(n + 1).fill("·");
  dp[0] = 1;
  dp[1] = 1;

  r.push({ label: "Base cases: f(0) = f(1) = 1", phase: "Init", line: 0, table: [dp.map((v) => v)], tableCell: [0, 1], vars: { n } });

  for (let i = 2; i <= n; i++) {
    r.cmp();
    dp[i] = (dp[i - 1] as number) + (dp[i - 2] as number);
    r.swap();
    r.push({
      label: `f(${i}) = f(${i - 1}) + f(${i - 2}) = ${dp[i]}`, phase: "Fill", line: 2,
      table: [dp.map((v) => v)], tableCell: [0, i],
      vars: { i, prev1: dp[i - 1], prev2: dp[i - 2], value: dp[i] },
    });
  }
  r.push({ label: `Ways to climb ${n} stairs = ${dp[n]}`, phase: "Done", line: 3, table: [dp.map((v) => v)], tableCell: [0, n], vars: { answer: dp[n] } });
  return r.frames;
}

// ─── Stack ───────────────────────────────────────────────────────────

function validParens(): VizFrame[] {
  const s = "{[()]}([])";
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const r = new Recorder();
  const stack: string[] = [];

  r.push({ label: `Input: ${s}`, phase: "Init", line: 0, stack: [], vars: { input: s } });

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(" || c === "[" || c === "{") {
      stack.push(c);
      r.swap();
      r.push({
        label: `Push '${c}'`, phase: "Push", line: 2, stack: [...stack],
        vars: { i, char: c, stack: stack.join("") },
      });
    } else {
      r.cmp();
      const top = stack.pop();
      const ok = top === pairs[c];
      r.push({
        label: ok ? `'${c}' closes '${top}' ✓` : `'${c}' does not close '${top}' ✗`,
        phase: ok ? "Match" : "Mismatch", line: 4, stack: [...stack],
        vars: { i, char: c, popped: top ?? "empty", valid: ok },
      });
      if (!ok) {
        r.push({ label: "Invalid — return false", phase: "Done", line: 5, stack: [...stack], vars: { result: false } });
        return r.frames;
      }
    }
  }
  r.push({
    label: stack.length === 0 ? "Stack empty → valid ✓" : "Unclosed brackets → invalid",
    phase: "Done", line: 6, stack: [...stack], vars: { result: stack.length === 0 },
  });
  return r.frames;
}

// ─── Registry ────────────────────────────────────────────────────────

export const ALGOS: VizAlgo[] = [
  {
    id: "merge-sort", name: "Merge Sort", category: "Sorting", render: "bars",
    time: "O(n log n)", space: "O(n)",
    blurb: "Split until trivial, then merge sorted halves. Stable, with no worst-case blow-up.",
    pseudo: [
      "function sort(a, lo, hi):",
      "  if hi - lo <= 1: return",
      "  mid = (lo + hi) / 2",
      "  sort(a, lo, mid)",
      "  sort(a, mid, hi)",
      "  # merge the two sorted halves",
      "  while i < len(L) and j < len(R):",
      "    a[k++] = L[i] <= R[j] ? L[i++] : R[j++]",
      "  while i < len(L): a[k++] = L[i++]",
      "  while j < len(R): a[k++] = R[j++]",
      "  # [lo, hi) is sorted",
      "return a",
    ],
    run: mergeSort,
  },
  {
    id: "quick-sort", name: "Quick Sort", category: "Sorting", render: "bars",
    time: "O(n log n) average", space: "O(log n)",
    blurb: "Partition around a pivot, recurse on both sides. Fast in practice, O(n²) worst case.",
    pseudo: [
      "function sort(a, lo, hi):",
      "  if lo >= hi: return",
      "  pivot = a[hi]",
      "  i = lo - 1",
      "  for j in lo..hi-1:",
      "    if a[j] <= pivot: swap(a[++i], a[j])",
      "  swap(a[i+1], a[hi])",
      "  sort(a, lo, i); sort(a, i+2, hi)",
      "return a",
    ],
    run: quickSort,
  },
  {
    id: "bubble-sort", name: "Bubble Sort", category: "Sorting", render: "bars",
    time: "O(n²)", space: "O(1)",
    blurb: "Repeatedly swap adjacent out-of-order pairs. Slow, but the clearest to watch.",
    pseudo: [
      "for i in 0..n-2:",
      "  # largest element bubbles to the end",
      "  for j in 0..n-i-2:",
      "    if a[j] > a[j+1]: swap(a[j], a[j+1])",
      "return a",
    ],
    run: bubbleSort,
  },
  {
    id: "insertion-sort", name: "Insertion Sort", category: "Sorting", render: "bars",
    time: "O(n²)", space: "O(1)",
    blurb: "Grow a sorted prefix one element at a time. Excellent on nearly-sorted input.",
    pseudo: [
      "for i in 1..n-1:",
      "  key = a[i]; j = i - 1",
      "  while j >= 0 and a[j] > key:",
      "    a[j+1] = a[j]; j--",
      "  a[j+1] = key",
      "return a",
    ],
    run: insertionSort,
  },
  {
    id: "binary-search", name: "Binary Search", category: "Searching", render: "bars",
    time: "O(log n)", space: "O(1)",
    blurb: "Halve the search space with every comparison.",
    pseudo: [
      "lo = 0; hi = n - 1",
      "while lo <= hi:",
      "  mid = lo + (hi - lo) / 2",
      "  if a[mid] == target: return mid",
      "  if a[mid] < target: lo = mid + 1",
      "  else: hi = mid - 1",
      "return -1",
    ],
    run: binarySearch,
  },
  {
    id: "two-sum", name: "Two Sum (Hash Map)", category: "Searching", render: "bars",
    time: "O(n)", space: "O(n)",
    blurb: "One pass, remembering what you have already seen.",
    pseudo: [
      "seen = {}",
      "for i, x in enumerate(nums):",
      "  need = target - x",
      "  if need in seen: return [seen[need], i]",
      "  seen[x] = i",
      "return []",
    ],
    run: twoSum,
  },
  {
    id: "kadane", name: "Kadane's Algorithm", category: "Dynamic Programming", render: "bars",
    time: "O(n)", space: "O(1)",
    blurb: "Maximum subarray sum — extend or restart, one decision per element.",
    pseudo: [
      "cur = best = a[0]",
      "for i in 1..n-1:",
      "  # restart if the prefix hurts",
      "  cur = max(a[i], cur + a[i])",
      "  best = max(best, cur)",
      "return best",
    ],
    run: kadane,
  },
  {
    id: "sliding-window", name: "Sliding Window", category: "Sliding Window", render: "bars",
    time: "O(n)", space: "O(k)",
    blurb: "Longest substring without repeats — a window that only ever moves right.",
    pseudo: [
      "left = 0; last = {}; best = 0",
      "for right in 0..n-1:",
      "  if s[right] in last and last[s[right]] >= left:",
      "    left = last[s[right]] + 1",
      "  last[s[right]] = right",
      "  best = max(best, right - left + 1)",
    ],
    run: slidingWindow,
  },
  {
    id: "bfs", name: "Breadth-First Search", category: "Graph", render: "graph",
    time: "O(V + E)", space: "O(V)",
    blurb: "Explore level by level with a queue. Finds shortest paths on unweighted graphs.",
    pseudo: [
      "queue = [start]; visited = {}",
      "while queue is not empty:",
      "  node = queue.dequeue()",
      "  mark node visited",
      "  for nb in neighbours(node):",
      "    if nb not visited: queue.enqueue(nb)",
    ],
    run: bfs,
  },
  {
    id: "dfs", name: "Depth-First Search", category: "Graph", render: "graph",
    time: "O(V + E)", space: "O(V)",
    blurb: "Go as deep as possible before backtracking. A stack, or recursion.",
    pseudo: [
      "stack = [start]; visited = {}",
      "while stack is not empty:",
      "  node = stack.pop()",
      "  mark node visited",
      "  for nb in neighbours(node):",
      "    if nb not visited: stack.push(nb)",
    ],
    run: dfs,
  },
  {
    id: "dp-table", name: "Coin Change (DP)", category: "Dynamic Programming", render: "table",
    time: "O(amount · coins)", space: "O(amount)",
    blurb: "Bottom-up table fill. Watch greedy fail and DP succeed on coins [1,3,4].",
    pseudo: [
      "dp = [∞] * (amount + 1); dp[0] = 0",
      "for x in 1..amount:",
      "  for c in coins:",
      "    if c <= x:",
      "      dp[x] = min(dp[x], dp[x - c] + 1)",
      "return dp[amount] if finite else -1",
    ],
    run: coinChange,
  },
  {
    id: "fib", name: "Climbing Stairs (DP)", category: "Dynamic Programming", render: "table",
    time: "O(n)", space: "O(n)",
    blurb: "The Fibonacci recurrence, filled left to right.",
    pseudo: [
      "dp[0] = dp[1] = 1",
      "for i in 2..n:",
      "  dp[i] = dp[i-1] + dp[i-2]",
      "return dp[n]",
    ],
    run: fib,
  },
  {
    id: "stack", name: "Valid Parentheses", category: "Stack", render: "stack",
    time: "O(n)", space: "O(n)",
    blurb: "Push openers, pop on closers. The stack must end empty.",
    pseudo: [
      "stack = []",
      "for c in s:",
      "  if c is an opener: stack.push(c)",
      "  else:",
      "    if stack.pop() != match(c): return false",
      "    # mismatch → invalid",
      "return stack.isEmpty()",
    ],
    run: validParens,
  },
];

export const algoById = (id: string) => ALGOS.find((a) => a.id === id);

export const DEFAULT_ARRAY = [38, 27, 43, 3, 9, 82, 10, 55, 21, 64];

export function randomArray(n = 10): number[] {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 90) + 5);
}
