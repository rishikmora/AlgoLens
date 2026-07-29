"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight, Calendar, Trophy, Mic, BookOpen, Sparkles,
  Play, CircleCheck, CircleDot, Activity,
} from "lucide-react";
import { PROBLEMS } from "@/data/problems";
import { PACKS } from "@/data/companies";
import { LEARNING_PATH } from "@/data/topics";
import { useProgress } from "@/lib/store";
import HeroViz from "@/components/HeroViz";
import { Card, SectionTitle, Badge, Button, Empty } from "@/components/ui";
import { cn, difficultyColor, seeded } from "@/lib/utils";

/** Same pick for everyone on a given day, without needing a server. */
const daily = () => {
  const day = new Date().toISOString().slice(0, 10);
  return PROBLEMS[Math.floor(seeded(day) * PROBLEMS.length)];
};
const dailyPack = () => {
  const day = new Date().toISOString().slice(0, 10);
  return PACKS[Math.floor(seeded(day + "pack") * PACKS.length)];
};

const PIPELINE = ["Learn", "Visualize", "Solve", "Interview", "Improve"];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { solved, submissions, interviews, name } = useProgress();
  useEffect(() => setMounted(true), []);

  const problem = daily();
  const pack = dailyPack();
  const solvedSet = new Set(Object.keys(solved));

  const nextTopic =
    LEARNING_PATH.find((t) =>
      PROBLEMS.every(
        (p) =>
          !p.topics.some((x) => x.toLowerCase().includes(t.name.toLowerCase())) ||
          !solvedSet.has(p.slug),
      ),
    ) ?? LEARNING_PATH[0];

  const recommended = PROBLEMS.filter((p) => !solvedSet.has(p.slug)).slice(0, 5);
  const xpFor = problem.difficulty === "Easy" ? 25 : problem.difficulty === "Medium" ? 60 : 120;

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="grid-bg border-b border-hairline">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div className="rise">
            <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {PIPELINE.map((s, i) => (
                <span key={s} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-2xs font-medium uppercase tracking-[0.11em]",
                      i === 0 ? "text-signal" : "text-faint",
                    )}
                  >
                    {s}
                  </span>
                  {i < PIPELINE.length - 1 && (
                    <span className="h-px w-3 bg-edge" />
                  )}
                </span>
              ))}
            </div>

            <h1 className="font-display text-4xl leading-[1.02] tracking-[-0.02em] text-primary sm:text-5xl">
              Stop memorising
              <br />
              solutions.{" "}
              <em className="italic text-signal">Watch
              <br />
              them run.</em>
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-secondary">
              {mounted && `${name}, every `}
              {!mounted && "Every "}
              accepted solution replays frame by frame, synchronized with your code — then an AI
              interviewer grills you on it like the real thing.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              <Link href={`/problems/${problem.slug}`}>
                <Button variant="primary" size="lg">
                  <Play /> Today&apos;s challenge
                </Button>
              </Link>
              <Link href="/interview">
                <Button size="lg">
                  <Mic /> Mock interview
                </Button>
              </Link>
              <Link href="/visualize">
                <Button variant="ghost" size="lg">
                  <Activity /> Visualizer
                </Button>
              </Link>
            </div>
          </div>

          <Card className="p-4 sm:p-5" raised>
            <HeroViz />
          </Card>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-10">
        {/* ── Three doors ──────────────────────────────────────── */}
        <div className="mb-12 grid gap-3 md:grid-cols-3">
          <Card className="flex flex-col p-4" interactive>
            <div className="eyebrow mb-2.5 flex items-center gap-1.5">
              <Calendar className="size-3.5 text-signal" /> Daily Challenge
            </div>
            <Link href={`/problems/${problem.slug}`} className="group">
              <h3 className="font-display text-xl text-primary transition-colors group-hover:text-signal">
                {problem.title}
              </h3>
            </Link>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className={difficultyColor[problem.difficulty]}>{problem.difficulty}</span>
              <span className="text-faint">·</span>
              <span className="text-tertiary">{problem.acceptance}% acceptance</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {problem.topics.map((t) => <Badge key={t}>{t}</Badge>)}
            </div>
            <p className="mt-auto pt-4 text-2xs text-faint">
              Keeps your streak alive · +{xpFor} XP
            </p>
          </Card>

          <Card className="flex flex-col p-4" interactive>
            <div className="eyebrow mb-2.5 flex items-center gap-1.5">
              <Trophy className="size-3.5 text-warn" /> Weekly Contest
            </div>
            <h3 className="font-display text-xl text-primary">Weekly Contest 47</h3>
            <p className="mt-1.5 text-xs text-tertiary">4 problems · 90 minutes · rated</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl text-warn">Sat</span>
              <span className="font-mono text-xs text-faint">08:00 IST</span>
            </div>
            <div className="mt-auto pt-4">
              <Link href="/contests">
                <Button size="sm" variant="outline">
                  View contests <ArrowRight />
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col p-4" interactive>
            <div className="eyebrow mb-2.5 flex items-center gap-1.5">
              <Mic className="size-3.5 text-ai" /> Interview of the Day
            </div>
            <h3 className="font-display text-xl text-primary">{pack.name}</h3>
            <p className="mt-1.5 text-xs text-tertiary">{pack.focus.slice(0, 3).join(" · ")}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {pack.signals.slice(0, 3).map((s) => <Badge key={s} tone="ai">{s}</Badge>)}
            </div>
            <div className="mt-auto pt-4">
              <Link href={`/interview?pack=${pack.id}`}>
                <Button size="sm" variant="primary">
                  <Mic /> Start
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* ── Continue learning ────────────────────────────────── */}
        <section className="mb-12">
          <SectionTitle
            action={
              <Link href="/learn" className="text-xs text-tertiary transition-colors hover:text-signal">
                Full roadmap →
              </Link>
            }
          >
            Continue Learning
          </SectionTitle>
          <Card className="flex flex-wrap items-center justify-between gap-5 p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <BookOpen className="size-4 shrink-0 text-mint" />
                <h3 className="font-display text-xl text-primary">{nextTopic.name}</h3>
                <Badge tone="mint">next up</Badge>
              </div>
              <p className="mt-2 text-sm text-secondary">{nextTopic.blurb}</p>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {nextTopic.keyIdeas.map((k) => <Badge key={k}>{k}</Badge>)}
              </div>
            </div>
            <Link href="/learn">
              <Button>Continue <ArrowRight /></Button>
            </Link>
          </Card>
        </section>

        {/* ── Recommended + activity ───────────────────────────── */}
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <section>
            <SectionTitle
              action={
                <Link href="/problems" className="text-xs text-tertiary transition-colors hover:text-signal">
                  All problems →
                </Link>
              }
            >
              Recommended for you
            </SectionTitle>
            <Card className="divide-y divide-hairline overflow-hidden">
              {recommended.length === 0 && <Empty>Everything here is solved. Try a contest.</Empty>}
              {recommended.map((p) => (
                <Link
                  key={p.slug}
                  href={`/problems/${p.slug}`}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-elevated"
                >
                  <CircleDot className="size-3.5 shrink-0 text-faint transition-colors group-hover:text-signal" />
                  <span className="flex-1 truncate text-sm text-primary">{p.title}</span>
                  <span className="hidden shrink-0 gap-1 sm:flex">
                    {p.topics.slice(0, 2).map((t) => <Badge key={t}>{t}</Badge>)}
                  </span>
                  <span className={cn("w-14 shrink-0 text-right text-xs", difficultyColor[p.difficulty])}>
                    {p.difficulty}
                  </span>
                </Link>
              ))}
            </Card>
            <p className="mt-2.5 flex items-center gap-1.5 text-2xs text-faint">
              <Sparkles className="size-3" />
              Ranked by the topics you haven&apos;t touched yet.
            </p>
          </section>

          <section>
            <SectionTitle>Recent Activity</SectionTitle>
            <Card className="divide-y divide-hairline overflow-hidden">
              {!mounted || (submissions.length === 0 && interviews.length === 0) ? (
                <Empty>Nothing yet — solve a problem to start your history.</Empty>
              ) : (
                <>
                  {submissions.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      {s.verdict === "Accepted" ? (
                        <CircleCheck className="size-3.5 shrink-0 text-signal" />
                      ) : (
                        <CircleDot className="size-3.5 shrink-0 text-danger" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-primary">{s.title}</div>
                        <div className="text-2xs text-faint">
                          {s.verdict} · {s.passed}/{s.total} · {s.lang}
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-2xs text-faint">
                        {new Date(s.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                  {interviews.slice(0, 3).map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                      <Mic className="size-3.5 shrink-0 text-ai" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-primary">{r.packName} interview</div>
                        <div className="text-2xs text-faint">{r.report.verdict}</div>
                      </div>
                      <span className="shrink-0 font-mono text-sm text-signal">{r.report.overall}%</span>
                    </div>
                  ))}
                </>
              )}
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}
