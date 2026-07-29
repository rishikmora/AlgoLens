"use client";

import { useState } from "react";
import { Shuffle, ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { ALGOS, DEFAULT_ARRAY, randomArray, type VizAlgo } from "@/lib/algos";
import { VizPlayer } from "@/components/Visualizer";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

const CATEGORIES = Array.from(new Set(ALGOS.map((a) => a.category)));

export default function VisualizePage() {
  const [algo, setAlgo] = useState<VizAlgo>(ALGOS[0]);
  const [input, setInput] = useState<number[]>(DEFAULT_ARRAY);
  const [size, setSize] = useState(10);

  const usesArray = algo.render === "bars";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader
        eyebrow={`${ALGOS.length} algorithms`}
        title="Visualize"
        description="Every frame is a recorded step — scrub backwards, change speed, and watch the pseudocode line highlight as the data moves."
      />

      <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
        {/* Picker */}
        <div className="space-y-4">
          {CATEGORIES.map((cat) => (
            <div key={cat}>
              <h3 className="mb-1.5 text-[10.5px] uppercase tracking-[0.12em] text-ink3">{cat}</h3>
              <div className="space-y-0.5">
                {ALGOS.filter((a) => a.category === cat).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAlgo(a)}
                    className={cn(
                      "w-full rounded-sm px-2 py-1.5 text-left text-[12.5px] transition-colors",
                      algo.id === a.id ? "bg-bg3 text-ink0" : "text-ink2 hover:bg-bg2 hover:text-ink0",
                    )}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Stage */}
        <div className="space-y-3">
          <Card className="p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-medium">{algo.name}</h2>
                <p className="text-[12.5px] text-ink2">{algo.blurb}</p>
              </div>
              <div className="flex gap-1.5">
                <Badge tone="lime">Time {algo.time}</Badge>
                <Badge tone="violet">Space {algo.space}</Badge>
              </div>
            </div>

            {usesArray && (
              <div className="mb-3 flex flex-wrap items-center gap-2 border-t border-line2 pt-2.5">
                <Button size="sm" onClick={() => setInput(randomArray(size))}>
                  <Shuffle className="h-3.5 w-3.5" /> Randomize
                </Button>
                <Button size="sm" onClick={() => setInput([...input].sort((a, b) => a - b))}>
                  <ArrowUpNarrowWide className="h-3.5 w-3.5" /> Sorted
                </Button>
                <Button size="sm" onClick={() => setInput([...input].sort((a, b) => b - a))}>
                  <ArrowDownWideNarrow className="h-3.5 w-3.5" /> Reversed
                </Button>
                <label className="ml-2 flex items-center gap-2 text-[12px] text-ink2">
                  n = {size}
                  <input
                    type="range"
                    min={5}
                    max={24}
                    value={size}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setSize(n);
                      setInput(randomArray(n));
                    }}
                    className="w-24 accent-lime"
                  />
                </label>
              </div>
            )}

            <div className="h-[30rem]">
              <VizPlayer algo={algo} input={input} />
            </div>
          </Card>

          <p className="text-[11.5px] text-ink3">
            The bar colours mean: <span className="text-amber">comparing</span> ·{" "}
            <span className="text-coral">writing</span> · <span className="text-violet">active range</span> ·{" "}
            <span className="text-lime">finalized</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
