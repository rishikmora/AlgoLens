"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react";
import { DEMO_GRAPH, type VizAlgo, type VizFrame } from "@/lib/algos";
import { Badge, Button, Kbd } from "./ui";
import { cn } from "@/lib/utils";

const SPEEDS = [0.5, 1, 2, 4];

/* ── Stage renderers ─────────────────────────────────────────────── */

function BarsView({ f }: { f: VizFrame }) {
  const a = f.array ?? [];
  const showValues = a.length <= 16;
  const min = Math.min(0, ...a);
  const max = Math.max(1, ...a);
  const span = max - min || 1;
  const zero = (-min / span) * 100;

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex min-h-0 flex-1 items-stretch gap-[3px]">
        {min < 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-edge"
            style={{ bottom: `${zero}%` }}
          />
        )}
        {a.map((v, i) => {
          const comparing = f.compare?.includes(i);
          const writing = f.write?.includes(i);
          const settled = f.done?.includes(i);
          const inRange = f.range ? i >= f.range[0] && i <= f.range[1] : false;
          const h = (Math.abs(v) / span) * 100;

          const tone = writing
            ? "bg-danger"
            : comparing
              ? "bg-warn"
              : settled
                ? "bg-signal"
                : inRange
                  ? "bg-ai/70"
                  : "bg-edge-strong";

          return (
            <div key={i} className="relative flex flex-1 flex-col justify-end">
              <div
                className={cn(
                  "w-full rounded-t-[2px] transition-[height,background-color] duration-200 ease-out",
                  tone,
                  (comparing || writing) && "ring-1 ring-inset ring-white/20",
                )}
                style={{
                  height: `${Math.max(2, h)}%`,
                  marginBottom: v < 0 ? `calc(${zero}% - ${h}%)` : `${zero}%`,
                }}
              />
              {showValues && (
                <span
                  className={cn(
                    "mt-1.5 text-center font-mono text-2xs tabular-nums transition-colors",
                    comparing || writing || settled ? "text-primary" : "text-faint",
                  )}
                >
                  {v}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Pointer rail */}
      {f.pointers && (
        <div className="mt-1 flex gap-[3px]">
          {a.map((_, i) => {
            const names = Object.entries(f.pointers!)
              .filter(([, idx]) => idx === i)
              .map(([k]) => k);
            return (
              <span
                key={i}
                className="flex-1 text-center font-mono text-2xs text-signal"
                style={{ minHeight: "1rem" }}
              >
                {names.join(",")}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GraphView({ f }: { f: VizFrame }) {
  const g = f.graph;
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      {DEMO_GRAPH.edges.map(([a, b], i) => {
        const na = DEMO_GRAPH.nodes[a];
        const nb = DEMO_GRAPH.nodes[b];
        const traversed = g?.visited.includes(a) && g?.visited.includes(b);
        return (
          <line
            key={i}
            x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            className={cn(
              "transition-all duration-300",
              traversed ? "stroke-signal" : "stroke-edge",
            )}
            strokeWidth={traversed ? 0.8 : 0.5}
          />
        );
      })}

      {DEMO_GRAPH.nodes.map((n) => {
        const current = g?.current === n.id;
        const visited = g?.visited.includes(n.id);
        const frontier = g?.frontier.includes(n.id);
        return (
          <g key={n.id} className="transition-all duration-300">
            {current && (
              <circle cx={n.x} cy={n.y} r={7.5} className="fill-danger/20 breathe" />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={current ? 5.2 : 4.3}
              className={cn(
                "transition-all duration-300",
                current ? "fill-danger" : visited ? "fill-signal" : frontier ? "fill-warn" : "fill-elevated",
              )}
              stroke="var(--color-edge)"
              strokeWidth={0.4}
            />
            <text
              x={n.x}
              y={n.y + 1.5}
              textAnchor="middle"
              fontSize="4"
              fontFamily="var(--font-jetbrains), monospace"
              fontWeight="600"
              fill={current || visited || frontier ? "var(--color-base)" : "var(--color-tertiary)"}
            >
              {n.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TableView({ f }: { f: VizFrame }) {
  const rows = f.table ?? [];
  return (
    <div className="flex h-full items-center overflow-x-auto">
      <div className="space-y-1">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-1">
            {row.map((cell, ci) => {
              const active = f.tableCell?.[0] === ri && f.tableCell?.[1] === ci;
              const unset = cell === "∞" || cell === "·";
              return (
                <div key={ci} className="flex flex-col items-center">
                  <div
                    className={cn(
                      "grid h-9 w-10 place-items-center rounded-sm border font-mono text-xs tabular-nums transition-all duration-200",
                      active
                        ? "border-signal bg-signal/15 text-signal shadow-[0_0_16px_-4px_var(--color-signal)]"
                        : unset
                          ? "border-hairline bg-raised text-faint"
                          : "border-edge bg-elevated text-primary",
                    )}
                  >
                    {cell}
                  </div>
                  <span className="mt-1 font-mono text-2xs text-faint">{ci}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function StackView({ f }: { f: VizFrame }) {
  const items = f.stack ?? [];
  return (
    <div className="flex h-full items-end justify-center pb-2">
      <div className="flex flex-col-reverse items-center gap-1">
        {items.length === 0 && (
          <span className="pb-3 font-mono text-xs text-faint">(empty)</span>
        )}
        {items.map((s, i) => (
          <div
            key={i}
            className={cn(
              "grid h-9 w-20 place-items-center rounded-sm border font-mono text-sm transition-all duration-200",
              i === items.length - 1
                ? "border-signal bg-signal/15 text-signal"
                : "border-edge bg-elevated text-secondary",
            )}
          >
            {s}
          </div>
        ))}
        <div className="mt-1.5 w-24 border-t border-edge pt-1.5 text-center font-mono text-2xs text-faint">
          bottom
        </div>
      </div>
    </div>
  );
}

function ComplexityChart({ frames, index }: { frames: VizFrame[]; index: number }) {
  const w = 280, h = 56;
  const slice = frames.slice(0, index + 1);
  const maxY = Math.max(1, frames[frames.length - 1]?.ops ?? 1);
  const n = Math.max(1, frames.length - 1);

  const line = (key: "ops" | "comparisons" | "swaps") =>
    slice.map((f, i) => `${i === 0 ? "M" : "L"} ${(i / n) * w} ${h - (f[key] / maxY) * h}`).join(" ");

  const area = `${line("ops")} L ${((slice.length - 1) / n) * w} ${h} L 0 ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="opsFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-info)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-info)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#opsFill)" />
      <path d={line("ops")} fill="none" stroke="var(--color-info)" strokeWidth="1.3" />
      <path d={line("comparisons")} fill="none" stroke="var(--color-warn)" strokeWidth="1.3" />
      <path d={line("swaps")} fill="none" stroke="var(--color-danger)" strokeWidth="1.3" />
    </svg>
  );
}

/* ── Player ──────────────────────────────────────────────────────── */

export function VizPlayer({
  algo,
  input,
  compact = false,
}: {
  algo: VizAlgo;
  input: number[];
  compact?: boolean;
}) {
  const frames = useMemo(() => {
    try {
      return algo.run(input);
    } catch (e) {
      return [{
        label: `Could not build the trace: ${String(e)}`, phase: "Error", line: 0,
        comparisons: 0, swaps: 0, ops: 0,
      } as VizFrame];
    }
  }, [algo, input]);

  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => { setI(0); setPlaying(false); }, [frames]);

  useEffect(() => {
    if (!playing) return;
    if (i >= frames.length - 1) { setPlaying(false); return; }
    const id = setTimeout(() => setI((x) => Math.min(frames.length - 1, x + 1)), 440 / speed);
    return () => clearTimeout(id);
  }, [playing, i, speed, frames.length]);

  const f = frames[Math.min(i, frames.length - 1)];

  const step = useCallback((d: number) => {
    setPlaying(false);
    setI((x) => Math.max(0, Math.min(frames.length - 1, x + d)));
  }, [frames.length]);

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      if (e.code === "Space") { e.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const phases = useMemo(() => {
    const seen: { phase: string; at: number }[] = [];
    frames.forEach((fr, idx) => {
      if (!seen.length || seen[seen.length - 1].phase !== fr.phase) seen.push({ phase: fr.phase, at: idx });
    });
    return seen;
  }, [frames]);

  const progress = ((i + 1) / frames.length) * 100;
  const vars = Object.entries(f.vars ?? {});

  return (
    <div ref={rootRef} className="flex h-full min-h-0 flex-col">
      <div className={cn("flex min-h-0 flex-1 gap-3", compact ? "flex-col" : "flex-col lg:flex-row")}>
        {/* Stage */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 pb-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <Badge tone={f.phase === "Error" ? "danger" : "signal"}>{f.phase}</Badge>
              <span className="truncate text-xs text-secondary">{f.label}</span>
            </div>
            <span className="shrink-0 font-mono text-2xs tabular-nums text-faint">
              {i + 1} / {frames.length}
            </span>
          </div>

          <div className={cn("surface min-h-0 flex-1 rounded-md p-4", compact ? "h-48" : "h-64")}>
            {algo.render === "bars" && <BarsView f={f} />}
            {algo.render === "graph" && <GraphView f={f} />}
            {algo.render === "table" && <TableView f={f} />}
            {algo.render === "stack" && <StackView f={f} />}
          </div>
        </div>

        {/* Inspectors */}
        <div className={cn("flex shrink-0 flex-col gap-2.5", compact ? "" : "lg:w-[19rem]")}>
          <div className="surface overflow-hidden rounded-md">
            <div className="eyebrow border-b border-hairline px-2.5 py-1.5">Pseudocode</div>
            <div className="max-h-56 overflow-y-auto py-1">
              {algo.pseudo.map((line, li) => {
                const on = li === f.line;
                return (
                  <div
                    key={li}
                    className={cn(
                      "relative flex gap-2 py-[3px] pl-2.5 pr-2 font-mono text-xs transition-colors duration-150",
                      on ? "bg-signal/10 text-signal" : "text-tertiary",
                    )}
                  >
                    {on && <span className="absolute inset-y-0 left-0 w-[2px] bg-signal" />}
                    <span className="w-4 shrink-0 select-none text-right text-faint">{li + 1}</span>
                    <span className="whitespace-pre">{line}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="surface overflow-hidden rounded-md">
            <div className="eyebrow border-b border-hairline px-2.5 py-1.5">Watch</div>
            <div className="max-h-36 space-y-1 overflow-y-auto p-2.5">
              {vars.length === 0 && (
                <span className="text-xs text-faint">no variables at this step</span>
              )}
              {vars.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 font-mono text-xs">
                  <span className="shrink-0 text-ai">{k}</span>
                  <span className="truncate text-primary">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="surface overflow-hidden rounded-md">
            <div className="flex items-center justify-between border-b border-hairline px-2.5 py-1.5">
              <span className="eyebrow">Live complexity</span>
              <span className="font-mono text-2xs text-tertiary">{algo.time}</span>
            </div>
            <div className="h-14 px-1 pt-1.5">
              <ComplexityChart frames={frames} index={i} />
            </div>
            <div className="flex justify-between gap-2 px-2.5 pb-2 font-mono text-2xs tabular-nums">
              <span className="text-info">ops {f.ops}</span>
              <span className="text-warn">cmp {f.comparisons}</span>
              <span className="text-danger">writes {f.swaps}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transport */}
      <div className="mt-3.5 shrink-0">
        <div className="group relative h-1.5 w-full overflow-hidden rounded-full bg-elevated">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-signal transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
          {phases.map((p, pi) => (
            <span
              key={pi}
              title={p.phase}
              className="absolute top-0 h-full w-px bg-base/60"
              style={{ left: `${(p.at / frames.length) * 100}%` }}
            />
          ))}
        </div>

        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={i}
          aria-label="Scrub timeline"
          onChange={(e) => { setPlaying(false); setI(Number(e.target.value)); }}
          className="mt-2 w-full"
        />

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => { setI(0); setPlaying(false); }} title="Replay">
            <RotateCcw />
          </Button>
          <Button size="sm" variant="outline" onClick={() => step(-1)} title="Step back">
            <SkipBack />
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="w-20"
            onClick={() => { if (i >= frames.length - 1) setI(0); setPlaying((p) => !p); }}
          >
            {playing ? <Pause /> : <Play />}
            {playing ? "Pause" : "Play"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => step(1)} title="Step forward">
            <SkipForward />
          </Button>

          <div className="ml-auto flex items-center gap-0.5 rounded-sm border border-edge p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={cn(
                  "rounded-xs px-1.5 py-0.5 font-mono text-2xs transition-colors",
                  speed === s ? "bg-signal text-on-signal" : "text-tertiary hover:text-primary",
                )}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-2xs text-faint">
          <Kbd>←</Kbd> <Kbd>→</Kbd> step · <Kbd>space</Kbd> play
        </p>
      </div>
    </div>
  );
}
