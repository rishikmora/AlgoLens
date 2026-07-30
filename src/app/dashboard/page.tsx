"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Flame, Coins, Zap, Trophy, Mic, Target, RotateCcw } from "lucide-react";
import { PROBLEMS, ALL_TOPICS, ALL_COMPANIES, type Difficulty } from "@/data/problems";
import { PACKS } from "@/data/companies";
import { useProgress, levelFor, BADGES, earnedBadges } from "@/lib/store";
import { Badge, Button, Card, PageHeader, ScoreBar, SectionTitle, Stat, Empty } from "@/components/ui";
import { cn } from "@/lib/utils";

const DIFFS: Difficulty[] = ["Easy", "Medium", "Hard"];
const DIFF_TONE: Record<Difficulty, string> = {
  Easy: "bg-teal",
  Medium: "bg-amber",
  Hard: "bg-coral",
};

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const st = useProgress();
  useEffect(() => setMounted(true), []);

  const solvedSlugs = useMemo(() => new Set(Object.keys(st.solved)), [st.solved]);
  const lvl = levelFor(st.xp);
  const badges = earnedBadges(st);

  const byDiff = DIFFS.map((d) => ({
    d,
    solved: Object.values(st.solved).filter((x) => x === d).length,
    total: PROBLEMS.filter((p) => p.difficulty === d).length,
  }));

  const accepted = st.submissions.filter((s) => s.verdict === "Accepted").length;
  const acceptance = st.submissions.length
    ? Math.round((accepted / st.submissions.length) * 100)
    : 0;

  // Topic strength: solved / available, per topic.
  const topicStats = ALL_TOPICS.map((t) => {
    const inTopic = PROBLEMS.filter((p) => p.topics.includes(t));
    const done = inTopic.filter((p) => solvedSlugs.has(p.slug)).length;
    return { topic: t, done, total: inTopic.length, pct: inTopic.length ? (done / inTopic.length) * 100 : 0 };
  }).sort((a, b) => a.pct - b.pct);

  const weakTopics = topicStats.filter((t) => t.pct < 60).slice(0, 5);

  // Interview readiness blends solve rate, coverage and past interview scores.
  const avgInterview = st.interviews.length
    ? st.interviews.reduce((a, r) => a + r.report.overall, 0) / st.interviews.length
    : 0;
  const coverage = (solvedSlugs.size / PROBLEMS.length) * 100;
  const readiness = Math.round(
    coverage * 0.4 + acceptance * 0.2 + (st.interviews.length ? avgInterview * 0.4 : 0),
  );

  const companyReadiness = ALL_COMPANIES.map((c) => {
    const cp = PROBLEMS.filter((p) => p.companies.includes(c));
    const done = cp.filter((p) => solvedSlugs.has(p.slug)).length;
    const packScore = st.interviews
      .filter((i) => PACKS.find((p) => p.id === i.packId)?.name === c)
      .reduce((a, r) => Math.max(a, r.report.overall), 0);
    return {
      company: c,
      pct: Math.round((cp.length ? (done / cp.length) * 100 : 0) * 0.6 + packScore * 0.4),
      done,
      total: cp.length,
    };
  }).sort((a, b) => b.pct - a.pct);

  // Activity heatmap — last 12 weeks.
  const heat = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    const counts = new Map<string, number>();
    for (const s of st.submissions) {
      const d = new Date(s.at).toISOString().slice(0, 10);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    for (let i = 83; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days.push({ date: d, count: counts.get(d) ?? 0 });
    }
    return days;
  }, [st.submissions]);

  if (!mounted) {
    return <div className="mx-auto max-w-6xl px-4 py-6 text-[13px] text-ink3">Loading your progress…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader
        eyebrow={`Level ${lvl.level} · ${lvl.name}`}
        title="Dashboard"
        description={
          lvl.next
            ? `${lvl.next.xp - st.xp} XP to ${lvl.next.name}`
            : "You've reached the highest level."
        }
        actions={
          <>
            <Link href="/profile"><Button>Public profile</Button></Link>
            <Button variant="ghost" onClick={() => { if (confirm("Reset all local progress?")) st.reset(); }}>
              <RotateCcw /> Reset
            </Button>
          </>
        }
      />

      {/* Top stats */}
      <div className="mb-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Solved" value={solvedSlugs.size} sub={`of ${PROBLEMS.length}`} tone="text-lime" />
        <Stat label="Acceptance" value={`${acceptance}%`} sub={`${st.submissions.length} submissions`} />
        <Stat label="Streak" value={st.streak} sub="days" tone="text-amber" />
        <Stat label="XP" value={st.xp} sub={`level ${lvl.level}`} tone="text-lime" />
        <Stat label="Coins" value={st.coins} tone="text-violet" />
        <Stat label="Interviews" value={st.interviews.length} sub={avgInterview ? `avg ${Math.round(avgInterview)}%` : "none yet"} tone="text-violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          {/* Difficulty breakdown */}
          <section>
            <SectionTitle>Problems solved</SectionTitle>
            <Card className="space-y-3 p-4">
              {byDiff.map(({ d, solved, total }) => (
                <div key={d}>
                  <div className="mb-1 flex items-baseline justify-between text-[12.5px]">
                    <span className="text-ink1">{d}</span>
                    <span className="font-mono text-ink2">{solved}/{total}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-bg3">
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-700", DIFF_TONE[d])}
                      style={{ width: `${total ? (solved / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </Card>
          </section>

          {/* Heatmap */}
          <section>
            <SectionTitle>Activity</SectionTitle>
            <Card className="p-4">
              <div className="flex flex-wrap gap-[3px]">
                {heat.map((d) => (
                  <span
                    key={d.date}
                    title={`${d.date}: ${d.count} submission${d.count === 1 ? "" : "s"}`}
                    className={cn(
                      "h-3 w-3 rounded-[2px]",
                      d.count === 0 ? "bg-bg3"
                        : d.count < 2 ? "bg-lime/30"
                        : d.count < 4 ? "bg-lime/60"
                        : "bg-lime",
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-ink3">Last 12 weeks · {st.submissions.length} submissions</p>
            </Card>
          </section>

          {/* Weak topics */}
          <section>
            <SectionTitle
              action={<Link href="/learn" className="text-[12px] text-ink2 hover:text-lime">Roadmap →</Link>}
            >
              Weak topics
            </SectionTitle>
            <Card className="p-4">
              {weakTopics.length === 0 ? (
                <Empty>No weak spots — every topic is above 60%.</Empty>
              ) : (
                <div className="space-y-4">
                  {weakTopics.map((t) => {
                    const todo = PROBLEMS.filter(
                      (p) => p.topics.includes(t.topic) && !solvedSlugs.has(p.slug),
                    ).slice(0, 4);
                    return (
                      <div key={t.topic}>
                        <ScoreBar
                          label={t.topic}
                          value={Math.round(t.pct)}
                          note={`${t.done}/${t.total} solved`}
                        />
                        {todo.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-0.5">
                            <span className="text-2xs text-faint">Practice:</span>
                            {todo.map((p) => (
                              <Link
                                key={p.slug}
                                href={`/problems/${p.slug}`}
                                className="rounded-xs border border-edge bg-elevated px-1.5 py-0.5 text-2xs text-secondary transition-colors hover:border-signal/40 hover:text-signal"
                              >
                                {p.title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          {/* Readiness */}
          <section>
            <SectionTitle>Interview readiness</SectionTitle>
            <Card className="p-4">
              <div className="mb-3 flex items-baseline gap-2">
                <span className="font-mono text-3xl text-lime">{readiness}%</span>
                <span className="text-[12px] text-ink2">
                  {readiness >= 80 ? "ready for onsites"
                    : readiness >= 55 ? "getting there"
                    : "keep grinding"}
                </span>
              </div>
              <div className="space-y-2">
                <ScoreBar label="Problem coverage" value={Math.round(coverage)} note={`${solvedSlugs.size}/${PROBLEMS.length} problems`} />
                <ScoreBar label="Submission accuracy" value={acceptance} note={`${accepted} accepted`} />
                <ScoreBar
                  label="Mock interview average"
                  value={Math.round(avgInterview)}
                  note={st.interviews.length ? `${st.interviews.length} interview(s)` : "take one to unlock"}
                />
              </div>
              {st.interviews.length === 0 && (
                <Link href="/interview" className="mt-3 inline-block">
                  <Button size="sm" variant="primary"><Mic className="h-3 w-3" /> Take a mock interview</Button>
                </Link>
              )}
            </Card>
          </section>

          {/* Company readiness */}
          <section>
            <SectionTitle>Company readiness</SectionTitle>
            <Card className="divide-y divide-line2">
              {companyReadiness.slice(0, 6).map((c) => (
                <div key={c.company} className="flex items-center gap-3 px-3.5 py-2">
                  <span className="w-24 shrink-0 truncate text-[12.5px] text-ink1">{c.company}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg3">
                    <div className="h-full rounded-full bg-azure transition-[width] duration-700" style={{ width: `${c.pct}%` }} />
                  </div>
                  <span className="w-9 shrink-0 text-right font-mono text-[11.5px] text-ink2">{c.pct}%</span>
                </div>
              ))}
            </Card>
          </section>

          {/* Gamification */}
          <section>
            <SectionTitle>Achievements</SectionTitle>
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-3 text-[12.5px]">
                <span className="flex items-center gap-1 text-amber"><Flame className="h-3.5 w-3.5" /> {st.streak}</span>
                <span className="flex items-center gap-1 text-violet"><Coins className="h-3.5 w-3.5" /> {st.coins}</span>
                <span className="flex items-center gap-1 text-lime"><Zap className="h-3.5 w-3.5" /> {st.xp}</span>
              </div>
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-bg3">
                <div className="h-full rounded-full bg-lime transition-[width] duration-700" style={{ width: `${lvl.progress}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {BADGES.map((b) => {
                  const has = badges.has(b.id);
                  return (
                    <div
                      key={b.id}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-2 py-1.5",
                        has ? "border-lime/30 bg-lime/8" : "border-line bg-bg1 opacity-45",
                      )}
                    >
                      <span className="text-[15px]">{b.icon}</span>
                      <div className="min-w-0">
                        <div className="truncate text-[12px] text-ink0">{b.name}</div>
                        <div className="truncate text-[10px] text-ink3">{b.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>

          {/* Recent interviews */}
          {st.interviews.length > 0 && (
            <section>
              <SectionTitle>Recent interviews</SectionTitle>
              <Card className="divide-y divide-line2">
                {st.interviews.slice(0, 4).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <Trophy className="h-3.5 w-3.5 shrink-0 text-amber" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px]">{r.packName}</div>
                      <div className="text-[11px] text-ink3">{r.report.verdict}</div>
                    </div>
                    <span className="font-mono text-[13px] text-lime">{r.report.overall}%</span>
                  </div>
                ))}
              </Card>
            </section>
          )}

          <Card className="p-4">
            <div className="flex items-start gap-2">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              <div>
                <h3 className="text-[13px] font-medium">Today&apos;s recommendation</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink2">
                  {weakTopics.length > 0
                    ? `Your weakest topic is ${weakTopics[0].topic}. Solve one problem there, then take a ${PACKS[0].name} mock to pressure-test it.`
                    : "Coverage looks good. Take a timed mock interview — communication is what's left to sharpen."}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {weakTopics.slice(0, 3).map((t) => (
                    <Badge key={t.topic} tone="teal">{t.topic}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
