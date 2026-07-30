"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleCheck, CircleDot, Flame, Target } from "lucide-react";
import { buildMission } from "@/lib/ai/coach";
import { useProgress } from "@/lib/store";
import { Badge, Card } from "./ui";
import { cn, difficultyColor } from "@/lib/utils";

export default function DailyCoach() {
  const [mounted, setMounted] = useState(false);
  const { name, submissions, solved, interviews, streak } = useProgress();
  useEffect(() => setMounted(true), []);

  // Depends on the clock and on persisted state, so it must not render on the server.
  if (!mounted) {
    return <Card className="h-[13.5rem] animate-pulse"><span className="sr-only">Loading today&apos;s mission</span></Card>;
  }

  const mission = buildMission({ name, submissions, solved, interviews, streak });
  const done = mission.problems.filter((p) => solved[p.slug]).length;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline p-4 pb-3">
        <div className="min-w-0">
          <div className="eyebrow mb-1.5 flex items-center gap-1.5">
            <Target className="size-3.5 text-signal" /> Daily AI Coach
          </div>
          <h3 className="font-display text-xl text-primary">{mission.greeting}</h3>
          <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-secondary">
            {mission.observation}
          </p>
          <p className="mt-1 max-w-lg text-sm leading-relaxed text-tertiary">{mission.reason}</p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {streak > 0 && (
            <span className="flex items-center gap-1 font-mono text-xs text-warn">
              <Flame className="size-3.5" /> {streak}d
            </span>
          )}
          <div className="text-right">
            <div className="font-display text-2xl leading-none tabular-nums text-signal">
              {done}<span className="text-tertiary">/3</span>
            </div>
            <div className="text-2xs text-faint">mission</div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-hairline">
        {mission.problems.map((p, i) => {
          const isDone = Boolean(solved[p.slug]);
          return (
            <Link
              key={p.slug}
              href={`/problems/${p.slug}`}
              className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-elevated"
            >
              <span className="w-4 shrink-0 font-mono text-2xs text-faint">{i + 1}</span>
              {isDone ? (
                <CircleCheck className="size-3.5 shrink-0 text-signal" />
              ) : (
                <CircleDot className="size-3.5 shrink-0 text-faint transition-colors group-hover:text-signal" />
              )}
              <span
                className={cn(
                  "flex-1 truncate text-sm",
                  isDone ? "text-tertiary line-through" : "text-primary",
                )}
              >
                {p.title}
              </span>
              {mission.focusTopic && p.topics.includes(mission.focusTopic) && (
                <Badge tone="signal">{mission.focusTopic}</Badge>
              )}
              <span className={cn("w-14 shrink-0 text-right text-xs", difficultyColor[p.difficulty])}>
                {p.difficulty}
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
