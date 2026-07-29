"use client";

import { useEffect, useMemo, useState } from "react";
import { algoById, randomArray, type VizFrame } from "@/lib/algos";
import { cn } from "@/lib/utils";

const CYCLE = ["merge-sort", "quick-sort", "insertion-sort"] as const;
const BARS = 28;
const FRAME_MS = 48;
const HOLD_MS = 1400;

/**
 * The home page claims you can watch algorithms run, so it runs one.
 * Sorts continuously, holds on the finished state, then reshuffles with
 * the next algorithm in the cycle. Purely decorative — it never blocks
 * interaction and it pauses when the tab is hidden.
 */
export default function HeroViz() {
  const [round, setRound] = useState(0);
  const [i, setI] = useState(0);
  // The shuffle uses Math.random, so it must not run during SSR — the server
  // and client would disagree and React would blow away the tree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const algoId = CYCLE[round % CYCLE.length];
  const algo = algoById(algoId)!;

  const frames = useMemo<VizFrame[]>(() => {
    if (!mounted) return [];
    // `round` seeds a fresh shuffle each cycle.
    void round;
    try {
      return algo.run(randomArray(BARS));
    } catch {
      return [];
    }
  }, [algo, round, mounted]);

  useEffect(() => {
    setI(0);
  }, [frames]);

  // Advance one frame at a time. The updater stays pure — scheduling from
  // inside it would be double-invoked by StrictMode.
  useEffect(() => {
    if (!frames.length) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setI((prev) => (prev < frames.length - 1 ? prev + 1 : prev));
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [frames]);

  // Hold on the sorted state, then reshuffle with the next algorithm.
  useEffect(() => {
    if (!frames.length || i < frames.length - 1) return;
    const id = setTimeout(() => setRound((r) => r + 1), HOLD_MS);
    return () => clearTimeout(id);
  }, [i, frames]);

  const f = frames[Math.min(i, Math.max(0, frames.length - 1))];

  // Matches the live layout so nothing shifts when the animation takes over.
  if (!f) {
    return (
      <div className="relative select-none" aria-hidden="true">
        <div className="flex h-40 items-end gap-[3px] sm:h-52">
          {Array.from({ length: BARS }, (_, idx) => (
            <div
              key={idx}
              className="flex-1 rounded-t-[2px] bg-edge-strong/40"
              style={{ height: `${28 + ((idx * 37) % 62)}%` }}
            />
          ))}
        </div>
        <div className="mt-px h-px w-full bg-gradient-to-r from-transparent via-edge to-transparent" />
        <div className="mt-3 h-4" />
      </div>
    );
  }

  const arr = f.array ?? [];
  const max = Math.max(1, ...arr);
  const done = i >= frames.length - 1;

  return (
    <div className="relative select-none" aria-hidden="true">
      <div className="flex h-40 items-end gap-[3px] sm:h-52">
        {arr.map((v, idx) => {
          const comparing = f.compare?.includes(idx);
          const writing = f.write?.includes(idx);
          const settled = done || f.done?.includes(idx);
          const inRange = f.range ? idx >= f.range[0] && idx <= f.range[1] : false;

          return (
            <div
              key={idx}
              className={cn(
                "flex-1 rounded-t-[2px] transition-all duration-150 ease-out",
                writing
                  ? "bg-danger"
                  : comparing
                    ? "bg-warn"
                    : settled
                      ? "bg-signal"
                      : inRange
                        ? "bg-ai/60"
                        : "bg-edge-strong",
              )}
              style={{
                height: `${(v / max) * 100}%`,
                opacity: settled ? 1 : inRange || comparing || writing ? 0.95 : 0.5,
              }}
            />
          );
        })}
      </div>

      {/* Baseline */}
      <div className="mt-px h-px w-full bg-gradient-to-r from-transparent via-edge to-transparent" />

      <div className="mt-3 flex items-center justify-between gap-3 font-mono text-2xs text-faint">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "size-1.5 rounded-full transition-colors",
              done ? "bg-signal" : "bg-warn breathe",
            )}
          />
          <span className="text-tertiary">{algo.name}</span>
          <span className="hidden sm:inline">{done ? "sorted" : f.phase.toLowerCase()}</span>
        </span>
        <span className="flex gap-3 tabular-nums">
          <span>{f.comparisons} cmp</span>
          <span className="hidden sm:inline">{f.swaps} writes</span>
          <span className="text-tertiary">{algo.time}</span>
        </span>
      </div>
    </div>
  );
}
