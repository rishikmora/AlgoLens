"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { Lock, CircleCheck, CircleDot, ArrowRight, Sparkles } from "lucide-react";
import { LEARNING_PATH, type TopicNode } from "@/data/topics";
import { PROBLEMS } from "@/data/problems";
import { useProgress } from "@/lib/store";
import { Badge, Button, Card, PageHeader, SectionTitle } from "@/components/ui";
import { cn, difficultyColor } from "@/lib/utils";

/** A topic counts as started once any problem tagged with it is solved. */
function topicProgress(topic: TopicNode, solved: Set<string>) {
  const related = PROBLEMS.filter((p) =>
    p.topics.some((t) => t.toLowerCase().replace(/\s/g, "-").includes(topic.id) || topic.name.toLowerCase() === t.toLowerCase()),
  );
  const done = related.filter((p) => solved.has(p.slug)).length;
  return { related, done, pct: related.length ? (done / related.length) * 100 : 0 };
}

export default function LearnPage() {
  const [mounted, setMounted] = useState(false);
  const solvedMap = useProgress((s) => s.solved);
  const [selected, setSelected] = useState<string>(LEARNING_PATH[0].id);
  useEffect(() => setMounted(true), []);

  const solved = useMemo(() => new Set(Object.keys(solvedMap)), [solvedMap]);

  const state = useMemo(() => {
    const map = new Map<string, { done: number; total: number; pct: number; unlocked: boolean }>();
    for (const t of LEARNING_PATH) {
      const { related, done, pct } = topicProgress(t, solved);
      map.set(t.id, { done, total: related.length, pct, unlocked: true });
    }
    // A topic unlocks when every prerequisite is at least started (or has no problems yet).
    for (const t of LEARNING_PATH) {
      const unlocked = t.requires.every((r) => {
        const s = map.get(r);
        return !s || s.total === 0 || s.done > 0;
      });
      map.set(t.id, { ...map.get(t.id)!, unlocked });
    }
    return map;
  }, [solved]);

  const current = LEARNING_PATH.find((t) => t.id === selected)!;
  const cur = state.get(current.id)!;
  const curProblems = topicProgress(current, solved).related;

  const nextRecommended = LEARNING_PATH.find((t) => {
    const s = state.get(t.id)!;
    return s.unlocked && s.pct < 100;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader
        eyebrow={`${LEARNING_PATH.length} topics`}
        title="Learning path"
        description="Each topic unlocks once its prerequisites are underway. The order isn't arbitrary — every step reuses the one before it."
      />

      {mounted && nextRecommended && (
        <Card className="mb-5 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
              <div>
                <div className="text-[13px] font-medium">
                  Recommended next: {nextRecommended.name}
                </div>
                <p className="text-[12.5px] text-ink2">{nextRecommended.blurb}</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setSelected(nextRecommended.id)}>
              Open <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Spine */}
        <section>
          <SectionTitle>Roadmap</SectionTitle>
          <div className="relative">
            {LEARNING_PATH.map((t, i) => {
              const s = state.get(t.id)!;
              const isSel = selected === t.id;
              const complete = s.total > 0 && s.done === s.total;
              return (
                <div key={t.id} className="flex gap-3">
                  <div className="flex shrink-0 flex-col items-center">
                    <span
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full border transition-colors",
                        complete
                          ? "border-lime bg-lime text-black"
                          : s.done > 0
                            ? "border-lime bg-lime/15 text-lime"
                            : s.unlocked
                              ? "border-line bg-bg2 text-ink3"
                              : "border-line bg-bg1 text-ink3",
                      )}
                    >
                      {complete ? (
                        <CircleCheck className="h-3.5 w-3.5" />
                      ) : s.unlocked ? (
                        <CircleDot className="h-3.5 w-3.5" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                    </span>
                    {i < LEARNING_PATH.length - 1 && (
                      <span className={cn("w-px flex-1", s.done > 0 ? "bg-lime/40" : "bg-line")} />
                    )}
                  </div>

                  <button
                    onClick={() => setSelected(t.id)}
                    className={cn(
                      "mb-2 flex-1 rounded-md border px-3 py-2 text-left transition-colors",
                      isSel ? "border-lime/40 bg-lime/6" : "border-transparent hover:border-line hover:bg-bg1",
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13.5px] text-ink0">{t.name}</span>
                      <span className="font-mono text-[11px] text-ink3">
                        {mounted ? `${s.done}/${s.total}` : `${t.problems}`}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink2">{t.blurb}</p>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Detail */}
        <section>
          <SectionTitle>{current.name}</SectionTitle>
          <Card className="p-4">
            <p className="text-[13px] leading-relaxed text-ink1">{current.blurb}</p>

            <h3 className="mb-1.5 mt-3 text-[11px] uppercase tracking-[0.12em] text-ink3">Key ideas</h3>
            <div className="flex flex-wrap gap-1">
              {current.keyIdeas.map((k) => <Badge key={k} tone="teal">{k}</Badge>)}
            </div>

            {current.requires.length > 0 && (
              <>
                <h3 className="mb-1.5 mt-3 text-[11px] uppercase tracking-[0.12em] text-ink3">
                  Builds on
                </h3>
                <div className="flex flex-wrap gap-1">
                  {current.requires.map((r) => {
                    const dep = LEARNING_PATH.find((x) => x.id === r)!;
                    return (
                      <button key={r} onClick={() => setSelected(r)}>
                        <Badge tone="violet">{dep.name}</Badge>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {mounted && (
              <>
                <div className="mb-1 mt-4 flex items-baseline justify-between text-[12px]">
                  <span className="text-ink2">Progress</span>
                  <span className="font-mono text-ink1">{Math.round(cur.pct)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-bg3">
                  <div className="h-full rounded-full bg-lime transition-[width] duration-700" style={{ width: `${cur.pct}%` }} />
                </div>
              </>
            )}

            <h3 className="mb-1.5 mt-4 text-[11px] uppercase tracking-[0.12em] text-ink3">
              Problems in this build
            </h3>
            {curProblems.length === 0 ? (
              <p className="text-[12.5px] text-ink3">
                No problems tagged for {current.name} yet — this build ships {PROBLEMS.length} problems
                across the earlier topics.
              </p>
            ) : (
              <div className="divide-y divide-line2 rounded-md border border-line">
                {curProblems.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/problems/${p.slug}`}
                    className="flex items-center gap-2 px-2.5 py-2 transition-colors hover:bg-bg2"
                  >
                    {mounted && solved.has(p.slug) ? (
                      <CircleCheck className="h-3.5 w-3.5 shrink-0 text-lime" />
                    ) : (
                      <CircleDot className="h-3.5 w-3.5 shrink-0 text-ink3" />
                    )}
                    <span className="flex-1 truncate text-[13px]">{p.title}</span>
                    <span className={cn("text-[11.5px]", difficultyColor[p.difficulty])}>
                      {p.difficulty}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
