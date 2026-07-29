"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Bug, TriangleAlert } from "lucide-react";
import { compileAndRun, fmt, type Step } from "@/lib/interpreter";
import { Badge, Button, Empty } from "./ui";
import { cn } from "@/lib/utils";

const STEP_TONE: Record<string, string> = {
  "enter-frame": "violet",
  "exit-frame": "violet",
  "var-decl": "teal",
  assign: "teal",
  "array-write": "coral",
  binop: "neutral",
  "if-test": "amber",
  "loop-iter": "amber",
  return: "violet",
  "heap-alloc": "azure",
  done: "lime",
  error: "coral",
};

/**
 * Steps a JavaScript-subset program using the built-in interpreter.
 * Unlike print debugging, every variable write and stack frame is recorded,
 * so you can scrub backwards through execution.
 */
export default function DebugPanel({ code }: { code: string }) {
  const [armed, setArmed] = useState(false);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const result = useMemo(() => (armed ? compileAndRun(code) : null), [armed, code]);
  const steps: Step[] = result?.steps ?? [];

  useEffect(() => { setI(0); setPlaying(false); }, [result]);

  useEffect(() => {
    if (!playing || !steps.length) return;
    if (i >= steps.length - 1) { setPlaying(false); return; }
    timer.current = setTimeout(() => setI((x) => x + 1), 220);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [playing, i, steps.length]);

  const step = useCallback((d: number) => {
    setPlaying(false);
    setI((x) => Math.max(0, Math.min(steps.length - 1, x + d)));
  }, [steps.length]);

  const s = steps[Math.min(i, Math.max(0, steps.length - 1))];
  const lines = code.split("\n");
  const topFrame = s?.stack?.[s.stack.length - 1];
  const heapEntries = Object.entries(s?.heap ?? {});

  if (!armed) {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-start gap-2.5">
          <Bug className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
          <div>
            <h3 className="text-[13.5px] font-medium text-ink0">Visual debugger</h3>
            <p className="mt-1 max-w-lg text-[12.5px] leading-relaxed text-ink2">
              Runs your code through a built-in interpreter that records every step. You get line
              highlighting, live variables, the call stack and the heap — and you can step{" "}
              <em>backwards</em>, which no <code className="rounded-xs bg-bg3 px-1 font-mono text-[11.5px]">print()</code> can do.
            </p>
            <p className="mt-2 text-[11.5px] text-ink3">
              Supports a JavaScript subset: let/const, if/else, while, for, functions, recursion,
              arrays, and the builtins print, len, push, pop, max, min, abs, floor, ceil, sqrt.
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setArmed(true)}>
          <Bug className="h-3.5 w-3.5" /> Start debugging
        </Button>
      </div>
    );
  }

  if (result?.error && steps.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-start gap-2 rounded-md border border-coral/30 bg-coral/8 p-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
          <div>
            <div className="text-[13px] font-medium text-coral">Could not run</div>
            <pre className="mt-1 whitespace-pre-wrap font-mono text-[12px] text-ink1">{result.error}</pre>
          </div>
        </div>
        <Button size="sm" className="mt-3" onClick={() => setArmed(false)}>Back</Button>
      </div>
    );
  }

  if (!steps.length) return <Empty>Nothing to step through.</Empty>;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-line px-2.5 py-1.5">
        <Button size="sm" onClick={() => { setI(0); setPlaying(false); }} title="Replay">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" onClick={() => step(-1)} title="Step back">
          <SkipBack className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="primary" onClick={() => { if (i >= steps.length - 1) setI(0); setPlaying((p) => !p); }}>
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? "Pause" : "Resume"}
        </Button>
        <Button size="sm" onClick={() => step(1)} title="Step forward">
          <SkipForward className="h-3.5 w-3.5" />
        </Button>
        <span className="ml-1 font-mono text-[11px] text-ink3">
          step {i + 1}/{steps.length}
        </span>
        <Badge tone={(STEP_TONE[s.t] ?? "neutral") as never}>{s.t}</Badge>
        <span className="truncate text-[12px] text-ink1">{s.msg}</span>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setArmed(false)}>
          Reset
        </Button>
      </div>

      <input
        type="range"
        min={0}
        max={steps.length - 1}
        value={i}
        onChange={(e) => { setPlaying(false); setI(Number(e.target.value)); }}
        className="mx-2.5 my-1 shrink-0 accent-violet"
      />

      <div className="grid min-h-0 flex-1 gap-2 overflow-hidden p-2 lg:grid-cols-[1.3fr_1fr]">
        {/* Source with the executing line highlighted */}
        <div className="min-h-0 overflow-y-auto rounded-md border border-line bg-bg0 py-1">
          {lines.map((line, li) => (
            <div
              key={li}
              className={cn(
                "flex gap-2 px-2 font-mono text-[12px] leading-[1.55] transition-colors",
                li + 1 === s.line ? "bg-violet/15 text-ink0" : "text-ink2",
              )}
            >
              <span className="w-6 shrink-0 select-none text-right text-ink3">{li + 1}</span>
              <span className="whitespace-pre">{line || " "}</span>
            </div>
          ))}
        </div>

        {/* Inspectors */}
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          <Panel title={`Variables — ${topFrame?.name ?? "global"}`}>
            {Object.entries(topFrame?.vars ?? {}).length === 0 ? (
              <span className="text-[11.5px] text-ink3">none in scope</span>
            ) : (
              Object.entries(topFrame!.vars).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-2 font-mono text-[11.5px]">
                  <span className="text-violet">{k}</span>
                  <span className="truncate text-ink0">{fmt(v)}</span>
                </div>
              ))
            )}
          </Panel>

          <Panel title={`Call stack — depth ${s.stack?.length ?? 0}`}>
            {(s.stack ?? []).slice().reverse().map((fr, fi) => (
              <div
                key={fi}
                className={cn(
                  "flex items-baseline justify-between gap-2 rounded-xs px-1 py-0.5 font-mono text-[11.5px]",
                  fi === 0 ? "bg-violet/12 text-ink0" : "text-ink2",
                )}
              >
                <span>{fr.name}</span>
                <span className="text-ink3">line {fr.line}</span>
              </div>
            ))}
          </Panel>

          {heapEntries.length > 0 && (
            <Panel title="Heap">
              {heapEntries.map(([ref, v]) => (
                <div key={ref} className="font-mono text-[11.5px]">
                  <span className="text-azure">#{ref}</span>{" "}
                  <span className="text-ink0">{fmt(v)}</span>
                </div>
              ))}
            </Panel>
          )}

          {result?.output && result.output.length > 0 && (
            <Panel title="print() output">
              {result.output.map((o, oi) => (
                <div key={oi} className="font-mono text-[11.5px] text-ink1">{o}</div>
              ))}
            </Panel>
          )}

          <Panel title="Counters">
            <div className="flex justify-between font-mono text-[11.5px]">
              <span className="text-azure">ops {s.ops}</span>
              <span className="text-amber">cmp {s.comparisons}</span>
              <span className="text-coral">writes {s.writes}</span>
            </div>
          </Panel>

          {result?.error && (
            <div className="rounded-md border border-coral/30 bg-coral/8 p-2 font-mono text-[11.5px] text-coral">
              {result.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="shrink-0 overflow-hidden rounded-md border border-line bg-bg1">
      <div className="border-b border-line px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-ink3">
        {title}
      </div>
      <div className="space-y-0.5 p-2">{children}</div>
    </div>
  );
}
