"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Play, Send, CircleCheck, CircleX, Clock, Cpu, Lightbulb,
  Sparkles, Bug, TriangleAlert, ChevronRight, UserRoundSearch,
} from "lucide-react";
import { LANGS, type Lang, type Problem } from "@/data/problems";
import { judge, verdictColor, EXECUTABLE_LANGS, type RunOutcome } from "@/lib/judge";
import { reviewCode, type CodeReview } from "@/lib/ai/review";
import { algoById } from "@/lib/algos";
import { DEFAULT_ARRAY } from "@/lib/algos";
import { useProgress } from "@/lib/store";
import { useWorkspace } from "@/lib/workspace";
import { analyzePair, type PairNote } from "@/lib/ai/pair";
import CodeEditor, { type EditorInstance } from "./CodeEditor";
import DebugPanel from "./DebugPanel";
import { VizPlayer } from "./Visualizer";
import { Badge, Button, Tabs, ScoreBar, Empty, Markdown } from "./ui";
import { cn, difficultyColor } from "@/lib/utils";

/** Renders the `backtick` spans in pair-programmer notes as inline code. */
function inlineCode(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(
      /`(.+?)`/g,
      '<code class="rounded-xs bg-elevated px-1 font-mono text-[0.95em] text-primary">$1</code>',
    );
}

const LEFT_TABS = [
  { id: "description", label: "Description" },
  { id: "constraints", label: "Constraints" },
  { id: "examples", label: "Examples" },
  { id: "hints", label: "Hints" },
  { id: "editorial", label: "Editorial" },
  { id: "discussion", label: "Discussion" },
];

export default function Workspace({ problem }: { problem: Problem }) {
  const [lang, setLang] = useState<Lang>("javascript");
  const [code, setCode] = useState(problem.starter.javascript);
  const [leftTab, setLeftTab] = useState("description");
  const [bottomTab, setBottomTab] = useState("tests");
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [review, setReview] = useState<CodeReview | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [customInput, setCustomInput] = useState(JSON.stringify(problem.tests[0].args));
  const [customResult, setCustomResult] = useState<string | null>(null);
  const [splitPct, setSplitPct] = useState(42);
  const [pairNotes, setPairNotes] = useState<PairNote[]>([]);
  const editorRef = useRef<EditorInstance | null>(null);

  const { recordSubmission, saveDraft, drafts } = useProgress();
  const setWs = useWorkspace((s) => s.set);
  const resetHints = useWorkspace((s) => s.resetHints);

  const draftKey = `${problem.slug}:${lang}`;

  // Restore any saved draft when the problem or language changes.
  useEffect(() => {
    const saved = drafts[`${problem.slug}:${lang}`];
    setCode(saved ?? problem.starter[lang]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.slug, lang]);

  useEffect(() => {
    resetHints();
    setRevealed(0);
    setOutcome(null);
    setReview(null);
  }, [problem.slug, resetHints]);

  // Keep the floating tutor aware of what is on screen.
  useEffect(() => {
    setWs({ slug: problem.slug, code, lang });
  }, [problem.slug, code, lang, setWs]);

  useEffect(() => {
    const t = setTimeout(() => saveDraft(draftKey, code), 600);
    return () => clearTimeout(t);
  }, [code, draftKey, saveDraft]);

  // Debounced so it reacts to a finished thought, not every keystroke.
  useEffect(() => {
    if (lang !== "javascript") { setPairNotes([]); return; }
    const t = setTimeout(() => setPairNotes(analyzePair(code, problem)), 900);
    return () => clearTimeout(t);
  }, [code, lang, problem]);

  const run = useCallback(async (submit: boolean) => {
    setRunning(true);
    setBottomTab("tests");
    const tests = submit ? problem.tests : problem.tests.slice(0, 2);
    const res = await judge(lang, code, problem.fn, tests);
    setOutcome(res);
    setRunning(false);

    if (submit) {
      const r = reviewCode(code, { passed: res.passed, total: res.total, verdict: res.verdict }, problem);
      setReview(r);
      recordSubmission({
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        lang,
        verdict: res.verdict,
        passed: res.passed,
        total: res.total,
        runtimeMs: Math.round(res.runtimeMs),
        at: Date.now(),
      });
      // An accepted solution should show itself executing, not just say "Accepted".
      if (res.verdict === "Accepted" && lang === "javascript") setBottomTab("replay");
      else if (res.verdict === "Accepted" && problem.viz) setBottomTab("viz");
      else if (res.verdict === "Accepted") setBottomTab("review");
    }
  }, [code, lang, problem, recordSubmission]);

  async function runCustom() {
    setCustomResult(null);
    let args: unknown[];
    try {
      args = JSON.parse(customInput);
      if (!Array.isArray(args)) throw new Error("Input must be a JSON array of arguments");
    } catch (e) {
      setCustomResult(`Input error: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    const res = await judge(lang, code, problem.fn, [{ args, expected: "__any__" }]);
    if (res.message) { setCustomResult(res.message); return; }
    const r = res.results[0];
    setCustomResult(
      r?.error
        ? `Runtime error: ${r.error}`
        : `${problem.fn}(${args.map((a) => JSON.stringify(a)).join(", ")})\n→ ${JSON.stringify(r?.actual)}`,
    );
  }

  const viz = problem.viz ? algoById(problem.viz) : undefined;
  const executable = EXECUTABLE_LANGS.includes(lang);

  // ── Drag-to-resize split ──────────────────────────────────────────
  const dragging = useRef(false);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      setSplitPct(Math.max(24, Math.min(68, pct)));
    };
    const up = () => { dragging.current = false; document.body.style.cursor = ""; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  const bottomTabs = [
    { id: "tests", label: "Test Cases", badge: outcome ? (
        <span className={cn("font-mono text-[10px]", outcome.passed === outcome.total ? "text-lime" : "text-coral")}>
          {outcome.passed}/{outcome.total}
        </span>
      ) : undefined },
    { id: "console", label: "Console" },
    { id: "custom", label: "Custom Input" },
    {
      id: "replay",
      label: "Replay",
      badge: outcome?.verdict === "Accepted"
        ? <span className="size-1.5 rounded-full bg-signal" />
        : undefined,
    },
    { id: "review", label: "AI Review" },
    ...(viz ? [{ id: "viz", label: "Visualization" }] : []),
    { id: "debug", label: "Debug" },
  ];

  // Replay the case the user is most likely to care about: the first failure,
  // or case 1 when everything passed.
  const replayCase =
    outcome?.results.find((r) => !r.passed)?.idx ?? 0;
  const replayEntry = {
    fn: problem.fn,
    args: (outcome?.results[replayCase]?.args ?? problem.tests[0].args) as unknown[],
    label: outcome
      ? `test case ${replayCase + 1}${outcome.results[replayCase]?.passed === false ? " (failing)" : ""}`
      : "test case 1",
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] min-h-0 flex-col">
      {/* Problem header */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-hairline px-4 py-2.5">
        <h1 className="font-display text-lg leading-none text-primary">{problem.title}</h1>
        <span className={cn("text-xs font-medium", difficultyColor[problem.difficulty])}>
          {problem.difficulty}
        </span>
        <span className="h-3 w-px bg-edge" />
        <span className="font-mono text-2xs text-tertiary">{problem.acceptance}% acceptance</span>
        <div className="flex flex-wrap gap-1">
          {problem.topics.map((t) => <Badge key={t}>{t}</Badge>)}
        </div>
        <div className="ml-auto hidden items-center gap-1 lg:flex">
          <span className="text-2xs text-faint">Asked at</span>
          {problem.companies.slice(0, 4).map((c) => (
            <Badge key={c} tone="info">{c}</Badge>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ── Left: problem ─────────────────────────────────────── */}
        <div className="flex min-h-0 flex-col border-r border-line" style={{ width: `${splitPct}%` }}>
          <Tabs tabs={LEFT_TABS} active={leftTab} onChange={setLeftTab} className="shrink-0 px-2" />
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {leftTab === "description" && (
              <div className="space-y-4">
                <Markdown text={problem.description} />
                <div>
                  <h3 className="mb-1.5 text-[11px] uppercase tracking-[0.12em] text-ink3">Example</h3>
                  <ExampleBlock ex={problem.examples[0]} />
                </div>
              </div>
            )}

            {leftTab === "constraints" && (
              <ul className="space-y-1.5">
                {problem.constraints.map((c) => (
                  <li key={c} className="flex gap-2 font-mono text-[12.5px] text-ink1">
                    <span className="text-ink3">·</span>
                    {c}
                  </li>
                ))}
              </ul>
            )}

            {leftTab === "examples" && (
              <div className="space-y-3">
                {problem.examples.map((ex, i) => (
                  <div key={i}>
                    <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-ink3">
                      Example {i + 1}
                    </div>
                    <ExampleBlock ex={ex} />
                  </div>
                ))}
              </div>
            )}

            {leftTab === "hints" && (
              <div className="space-y-2.5">
                <p className="text-[12.5px] text-ink2">
                  Four levels, smallest nudge first. Reveal one at a time — that&apos;s how you build the
                  instinct instead of borrowing it.
                </p>
                {problem.hints.map((h, i) => (
                  <div key={i} className="rounded-md border border-line bg-bg1 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[12px] text-ink1">
                        <Lightbulb className={cn("h-3.5 w-3.5", i < revealed ? "text-amber" : "text-ink3")} />
                        Hint {i + 1}
                        {i === 3 && <Badge tone="coral">pseudocode</Badge>}
                      </span>
                      {i >= revealed && (
                        <Button size="sm" variant="ghost" onClick={() => setRevealed(i + 1)}>
                          Reveal <ChevronRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {i < revealed && (
                      <div className="mt-2 rise">
                        {i === 3 ? (
                          <pre className="overflow-x-auto rounded-sm bg-bg0 p-2 font-mono text-[12px] text-lime">
                            {h}
                          </pre>
                        ) : (
                          <p className="text-[13px] leading-relaxed text-ink1">{h}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {leftTab === "editorial" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Badge tone="lime">Time {problem.editorial.time}</Badge>
                  <Badge tone="violet">Space {problem.editorial.space}</Badge>
                </div>
                <p className="text-[13px] leading-relaxed text-ink1">{problem.editorial.approach}</p>
                <pre className="overflow-x-auto rounded-md border border-line bg-bg0 p-3 font-mono text-[12px] leading-relaxed text-ink0">
                  {problem.editorial.code}
                </pre>
                {viz && (
                  <Button size="sm" onClick={() => setBottomTab("viz")}>
                    <Play /> Watch it run
                  </Button>
                )}
              </div>
            )}

            {leftTab === "discussion" && (
              <div className="space-y-3">
                <Empty>
                  Community discussion isn&apos;t wired up in this build — it needs the backend
                  (Postgres + auth). The AI Tutor button, bottom right, answers the same questions
                  in the meantime.
                </Empty>
                <div className="space-y-2">
                  {[
                    { u: "priya_dev", t: `Does the ${problem.editorial.time} bound still hold if the input has duplicates?` },
                    { u: "marcus.k", t: "Interviewer asked me the O(1) space follow-up on this one at Amazon." },
                  ].map((d) => (
                    <div key={d.u} className="rounded-md border border-line bg-bg1 p-2.5 opacity-50">
                      <div className="text-[11px] text-ink3">{d.u} · sample thread</div>
                      <p className="mt-1 text-[12.5px] text-ink1">{d.t}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={() => { dragging.current = true; document.body.style.cursor = "col-resize"; }}
          className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-lime/30"
        />

        {/* ── Right: editor + console ───────────────────────────── */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b border-hairline px-2.5 py-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="h-7 rounded-sm border border-edge bg-raised px-2 text-xs text-primary outline-none focus:border-edge-strong"
            >
              {LANGS.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>

            {!executable && (
              <span className="flex items-center gap-1 rounded-sm border border-warn/25 bg-warn/10 px-1.5 py-0.5 text-2xs text-warn">
                <TriangleAlert className="size-3" /> no local runtime
              </span>
            )}

            <div className="ml-auto flex items-center gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setCode(problem.starter[lang])}>
                Reset
              </Button>
              <Button size="sm" onClick={() => run(false)} disabled={running}>
                <Play /> Run
              </Button>
              <Button size="sm" variant="primary" onClick={() => run(true)} disabled={running}>
                <Send /> Submit
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-[1.35]">
            <CodeEditor
              value={code}
              lang={lang}
              onChange={setCode}
              onRun={() => run(false)}
              onReady={(ed) => { editorRef.current = ed; }}
            />
          </div>

          {/* Pair programmer — watches the code, points at a line */}
          {pairNotes.length > 0 && (
            <div className="shrink-0 border-t border-hairline bg-sunken/50">
              <div className="flex items-center gap-1.5 px-2.5 pt-1.5">
                <UserRoundSearch className="size-3 text-ai" />
                <span className="eyebrow text-ai">Pair programmer</span>
              </div>
              <div className="flex flex-col gap-px px-2.5 pb-2 pt-1">
                {pairNotes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      editorRef.current?.revealLineInCenter(n.line);
                      editorRef.current?.setPosition({ lineNumber: n.line, column: 1 });
                      editorRef.current?.focus();
                    }}
                    className="group flex items-start gap-2 rounded-xs px-1 py-1 text-left transition-colors hover:bg-elevated"
                  >
                    <span
                      className={cn(
                        "mt-px shrink-0 rounded-xs border px-1 py-px font-mono text-2xs leading-tight",
                        n.severity === "bug" ? "border-danger/35 bg-danger/10 text-danger"
                          : n.severity === "warn" ? "border-warn/35 bg-warn/10 text-warn"
                          : "border-ai/35 bg-ai/10 text-ai",
                      )}
                    >
                      L{n.line}
                    </span>
                    <span
                      className="text-xs leading-snug text-secondary group-hover:text-primary"
                      dangerouslySetInnerHTML={{ __html: inlineCode(n.message) }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col border-t border-line">
            <Tabs tabs={bottomTabs} active={bottomTab} onChange={setBottomTab} className="shrink-0 px-2" />

            <div className="min-h-0 flex-1 overflow-y-auto">
              {bottomTab === "tests" && (
                <TestsPanel outcome={outcome} running={running} problem={problem} />
              )}

              {bottomTab === "console" && (
                <div className="p-3">
                  {!outcome ? (
                    <Empty>Run your code to see console output.</Empty>
                  ) : outcome.logs.length === 0 ? (
                    <Empty>No console output. Use console.log() to print.</Empty>
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-[12px] text-ink1">
                      {outcome.logs.join("\n")}
                    </pre>
                  )}
                </div>
              )}

              {bottomTab === "custom" && (
                <div className="space-y-2 p-3">
                  <div className="text-[11.5px] text-ink2">
                    Arguments as a JSON array — <code className="font-mono text-ink1">
                      [{problem.params.join(", ")}]
                    </code>
                  </div>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    rows={3}
                    className="w-full rounded-sm border border-line bg-bg0 p-2 font-mono text-[12px] text-ink0 outline-none focus:border-bg4"
                  />
                  <Button size="sm" onClick={runCustom}>
                    <Play className="h-3.5 w-3.5" /> Run with this input
                  </Button>
                  {customResult && (
                    <pre className="whitespace-pre-wrap rounded-sm border border-line bg-bg0 p-2 font-mono text-[12px] text-ink1">
                      {customResult}
                    </pre>
                  )}
                </div>
              )}

              {bottomTab === "replay" && (
                lang === "javascript" ? (
                  <DebugPanel
                    code={code}
                    entry={replayEntry}
                    autoStart={outcome?.verdict === "Accepted"}
                  />
                ) : (
                  <div className="p-3.5">
                    <Empty>
                      Replay steps through a JavaScript-subset interpreter. Switch the language to
                      JavaScript to watch your own solution execute line by line.
                    </Empty>
                  </div>
                )
              )}

              {bottomTab === "review" && (
                <ReviewPanel review={review} />
              )}

              {bottomTab === "viz" && viz && (
                <div className="h-full min-h-[22rem] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-lime" />
                    <span className="text-[12.5px] text-ink1">
                      {viz.name} — {viz.blurb}
                    </span>
                  </div>
                  <div className="h-[calc(100%-1.75rem)]">
                    <VizPlayer algo={viz} input={DEFAULT_ARRAY} compact />
                  </div>
                </div>
              )}

              {bottomTab === "debug" && (
                lang === "javascript" ? (
                  <DebugPanel code={code} />
                ) : (
                  <div className="p-3">
                    <Empty>
                      The step-through debugger interprets a JavaScript subset. Switch the language to
                      JavaScript to use it.
                    </Empty>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExampleBlock({ ex }: { ex: { input: string; output: string; explanation?: string } }) {
  return (
    <div className="rounded-md border border-line bg-bg0 p-2.5 font-mono text-[12px]">
      <div><span className="text-ink3">Input: </span><span className="text-ink0">{ex.input}</span></div>
      <div><span className="text-ink3">Output: </span><span className="text-lime">{ex.output}</span></div>
      {ex.explanation && (
        <div className="mt-1 font-sans text-[12px] text-ink2">{ex.explanation}</div>
      )}
    </div>
  );
}

function TestsPanel({
  outcome, running, problem,
}: {
  outcome: RunOutcome | null;
  running: boolean;
  problem: Problem;
}) {
  const [sel, setSel] = useState(0);

  if (running) {
    return (
      <div className="flex items-center gap-2 p-4 text-[13px] text-ink2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" /> Running…
      </div>
    );
  }

  if (!outcome) {
    return (
      <div className="p-3">
        <div className="mb-2 text-[11.5px] text-ink2">
          {problem.tests.length} test cases · Run executes the first 2, Submit runs all.
        </div>
        <div className="space-y-1.5">
          {problem.tests.slice(0, 3).map((t, i) => (
            <div key={i} className="rounded-sm border border-line bg-bg0 p-2 font-mono text-[12px]">
              <span className="text-ink3">Case {i + 1}: </span>
              <span className="text-ink1">{JSON.stringify(t.args)}</span>
              <span className="text-ink3"> → </span>
              <span className="text-ink1">{JSON.stringify(t.expected)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (outcome.message) {
    return (
      <div className="p-3">
        <div className="flex items-start gap-2 rounded-md border border-amber/30 bg-amber/8 p-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
          <div>
            <div className={cn("text-[13px] font-medium", verdictColor(outcome.verdict))}>
              {outcome.verdict}
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink1">{outcome.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const r = outcome.results[sel];

  const ok = outcome.verdict === "Accepted";

  return (
    <div className="p-3.5">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className={cn("flex items-center gap-2 font-display text-xl", verdictColor(outcome.verdict))}>
          {ok ? <CircleCheck className="size-4.5" /> : <CircleX className="size-4.5" />}
          {outcome.verdict}
        </span>
        <span className="font-mono text-xs tabular-nums text-secondary">
          {outcome.passed}/{outcome.total} passed
        </span>
        <span className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-tertiary">
          <Clock className="size-3" /> {outcome.runtimeMs.toFixed(1)} ms
        </span>
        <span className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-tertiary">
          <Cpu className="size-3" /> {outcome.memoryKb} KB
        </span>
      </div>

      <div className="mb-2.5 flex flex-wrap gap-1">
        {outcome.results.map((res, i) => (
          <button
            key={i}
            onClick={() => setSel(i)}
            className={cn(
              "flex items-center gap-1.5 rounded-sm border px-2 py-1 text-2xs transition-colors",
              sel === i
                ? "border-edge-strong bg-elevated text-primary"
                : "border-edge text-tertiary hover:text-primary",
            )}
          >
            <span className={cn("size-1.5 rounded-full", res.passed ? "bg-signal" : "bg-danger")} />
            Case {i + 1}
          </button>
        ))}
      </div>

      {r && (
        <div className="space-y-2 rounded-md border border-hairline bg-sunken p-3 font-mono text-xs">
          <Row label="Input" value={JSON.stringify(r.args)} />
          <Row label="Expected" value={JSON.stringify(r.expected)} />
          <Row
            label="Actual"
            value={r.error ? r.error : JSON.stringify(r.actual)}
            tone={r.passed ? "text-signal" : "text-danger"}
          />
          <Row label="Time" value={`${r.ms.toFixed(2)} ms`} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value, tone = "text-secondary" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-16 shrink-0 text-faint">{label}</span>
      <span className={cn("break-all", tone)}>{value}</span>
    </div>
  );
}

function ReviewPanel({ review }: { review: CodeReview | null }) {
  if (!review) {
    return (
      <div className="p-3">
        <Empty>Submit your solution to get a code review.</Empty>
      </div>
    );
  }
  return (
    <div className="grid gap-5 p-3.5 md:grid-cols-2">
      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl leading-none tabular-nums text-signal">
            {review.overall}%
          </span>
          <span className="text-xs text-tertiary">overall</span>
        </div>
        {review.scores.map((s) => (
          <ScoreBar key={s.label} label={s.label} value={s.value} note={s.note} />
        ))}
      </div>
      <div className="space-y-4">
        {review.strengths.length > 0 && (
          <div>
            <h4 className="eyebrow mb-2">What&apos;s good</h4>
            <ul className="space-y-1.5">
              {review.strengths.map((s) => (
                <li key={s} className="flex gap-2 text-xs leading-relaxed text-secondary">
                  <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-signal" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <h4 className="eyebrow mb-2">Suggestions</h4>
          <ul className="space-y-1.5">
            {review.suggestions.map((s) => (
              <li key={s} className="flex gap-2 text-xs leading-relaxed text-secondary">
                <Bug className="mt-0.5 size-3.5 shrink-0 text-warn" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        {review.alternative && (
          <div className="rounded-md border border-ai/25 bg-ai/[0.06] p-3">
            <h4 className="eyebrow mb-1.5 flex items-center gap-1.5 text-ai">
              <Sparkles className="size-3" /> Alternative approach
            </h4>
            <div className="text-sm font-medium text-primary">{review.alternative.title}</div>
            <p className="mt-1 text-xs leading-relaxed text-secondary">{review.alternative.body}</p>
          </div>
        )}
      </div>
    </div>
  );
}
