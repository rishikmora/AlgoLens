import type { Lang, TestCase } from "@/data/problems";

export type Verdict =
  | "Accepted"
  | "Wrong Answer"
  | "Runtime Error"
  | "Time Limit Exceeded"
  | "Compile Error"
  | "Needs Sandbox";

export interface TestResult {
  idx: number;
  passed: boolean;
  args: unknown[];
  expected: unknown;
  actual?: unknown;
  error?: string;
  ms: number;
}

export interface JudgeResult {
  verdict: Verdict;
  results: TestResult[];
  passed: number;
  total: number;
  runtimeMs: number;
  /** Rough figure derived from the run — not a real RSS measurement. */
  memoryKb: number;
  message?: string;
}

/** Languages that actually execute in this build. Everything else needs the sandbox service. */
export const EXECUTABLE_LANGS: Lang[] = ["javascript"];

const TIME_LIMIT_MS = 4000;

const WORKER_SRC = `
function deepEq(a, b) {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    return Number.isNaN(a) && Number.isNaN(b);
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEq(x, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(k => deepEq(a[k], b[k]));
  }
  return false;
}

self.onmessage = function (e) {
  var code = e.data.code, fn = e.data.fn, tests = e.data.tests;
  var logs = [];
  var realLog = console.log;
  console.log = function () {
    logs.push(Array.prototype.map.call(arguments, function (x) {
      try { return typeof x === 'string' ? x : JSON.stringify(x); } catch (_) { return String(x); }
    }).join(' '));
  };

  var f;
  try {
    var factory = new Function(code + '\\nreturn typeof ' + fn + " === 'function' ? " + fn + ' : null;');
    f = factory();
  } catch (err) {
    self.postMessage({ compileError: String(err && err.message || err) });
    return;
  }
  if (!f) {
    self.postMessage({ compileError: 'No function named "' + fn + '" was found. Keep the given signature.' });
    return;
  }

  var results = [];
  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var start = performance.now();
    try {
      var args = JSON.parse(JSON.stringify(t.args));
      var actual = f.apply(null, args);
      results.push({
        idx: i, passed: deepEq(actual, t.expected), args: t.args,
        expected: t.expected, actual: actual === undefined ? null : actual,
        ms: performance.now() - start,
      });
    } catch (err) {
      results.push({
        idx: i, passed: false, args: t.args, expected: t.expected,
        error: String(err && err.message || err), ms: performance.now() - start,
      });
    }
  }
  console.log = realLog;
  self.postMessage({ results: results, logs: logs });
};
`;

export interface RunOutcome extends JudgeResult {
  logs: string[];
}

/**
 * Runs user code against test cases inside a Web Worker with a hard timeout.
 * The worker gives us isolation from the page and a kill switch for infinite loops.
 */
export function runJavaScript(
  code: string,
  fn: string,
  tests: TestCase[],
): Promise<RunOutcome> {
  return new Promise((resolve) => {
    const started = performance.now();
    let worker: Worker;
    let url: string;

    const finish = (r: RunOutcome) => {
      clearTimeout(timer);
      try { worker.terminate(); URL.revokeObjectURL(url); } catch { /* already gone */ }
      resolve(r);
    };

    const timer = setTimeout(() => {
      finish({
        verdict: "Time Limit Exceeded",
        results: [],
        passed: 0,
        total: tests.length,
        runtimeMs: TIME_LIMIT_MS,
        memoryKb: 0,
        logs: [],
        message: `Execution exceeded ${TIME_LIMIT_MS} ms. Check for an infinite loop or a missing base case.`,
      });
    }, TIME_LIMIT_MS);

    try {
      url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "application/javascript" }));
      worker = new Worker(url);
    } catch (e) {
      clearTimeout(timer);
      resolve({
        verdict: "Runtime Error",
        results: [],
        passed: 0,
        total: tests.length,
        runtimeMs: 0,
        memoryKb: 0,
        logs: [],
        message: `Could not start the sandbox worker: ${String(e)}`,
      });
      return;
    }

    worker.onerror = (ev) => {
      finish({
        verdict: "Runtime Error",
        results: [],
        passed: 0,
        total: tests.length,
        runtimeMs: performance.now() - started,
        memoryKb: 0,
        logs: [],
        message: ev.message || "Worker crashed",
      });
    };

    worker.onmessage = (ev: MessageEvent) => {
      const data = ev.data as {
        compileError?: string;
        results?: TestResult[];
        logs?: string[];
      };

      if (data.compileError) {
        finish({
          verdict: "Compile Error",
          results: [],
          passed: 0,
          total: tests.length,
          runtimeMs: performance.now() - started,
          memoryKb: 0,
          logs: [],
          message: data.compileError,
        });
        return;
      }

      const results = data.results ?? [];
      const passed = results.filter((r) => r.passed).length;
      const anyError = results.some((r) => r.error);
      const verdict: Verdict =
        passed === results.length && results.length > 0
          ? "Accepted"
          : anyError
            ? "Runtime Error"
            : "Wrong Answer";

      finish({
        verdict,
        results,
        passed,
        total: results.length,
        runtimeMs: performance.now() - started,
        memoryKb: Math.round(1200 + results.length * 140 + code.length / 8),
        logs: data.logs ?? [],
      });
    };

    worker.postMessage({ code, fn, tests });
  });
}

/** Languages without a configured execution backend report that honestly. */
export function needsSandbox(lang: Lang, tests: TestCase[]): RunOutcome {
  return {
    verdict: "Needs Sandbox",
    results: [],
    passed: 0,
    total: tests.length,
    runtimeMs: 0,
    memoryKb: 0,
    logs: [],
    message:
      `${lang} execution requires the Docker judge service, which is not configured in this build. ` +
      `JavaScript runs locally in a Web Worker. See README → "Judge service" to wire up multi-language execution.`,
  };
}

export async function judge(
  lang: Lang,
  code: string,
  fn: string,
  tests: TestCase[],
): Promise<RunOutcome> {
  if (lang === "javascript") return runJavaScript(code, fn, tests);
  return needsSandbox(lang, tests);
}

export function verdictColor(v: Verdict) {
  if (v === "Accepted") return "text-lime";
  if (v === "Needs Sandbox") return "text-ink2";
  if (v === "Time Limit Exceeded") return "text-amber";
  return "text-coral";
}
