"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trophy, Clock, Users, Play, Medal } from "lucide-react";
import { PROBLEMS } from "@/data/problems";
import { useProgress } from "@/lib/store";
import { Badge, Button, Card, PageHeader, SectionTitle, Stat } from "@/components/ui";
import { cn, seeded, difficultyColor } from "@/lib/utils";

const UPCOMING = [
  { id: 47, name: "Weekly Contest 47", when: "Saturday 08:00 IST", mins: 90, problems: 4 },
  { id: 48, name: "Biweekly Contest 22", when: "Next Sunday 20:00 IST", mins: 90, problems: 4 },
];

const PAST = [
  { id: 46, name: "Weekly Contest 46", solved: 3, total: 4, rank: 1842, participants: 18930, rating: 1687, delta: +34 },
  { id: 45, name: "Weekly Contest 45", solved: 2, total: 4, rank: 4210, participants: 17402, rating: 1653, delta: -12 },
  { id: 44, name: "Biweekly Contest 21", solved: 3, total: 4, rank: 1520, participants: 12880, rating: 1665, delta: +41 },
];

/** Stable synthetic leaderboard — same ordering on every render. */
const LEADERS = [
  "kotlin_kestrel", "argmax_ada", "n_log_n", "segment_sage", "heapify_hana",
  "dijkstra_dev", "memo_mitra", "trie_tara", "bitmask_ben", "rishik",
].map((handle, i) => ({
  handle,
  rating: Math.round(2400 - i * 63 - seeded(handle) * 40),
  solved: Math.max(1, 4 - Math.floor(i / 3)),
  time: `${40 + i * 4}:${String(Math.floor(seeded(handle) * 60)).padStart(2, "0")}`,
}));

export default function ContestsPage() {
  const [mounted, setMounted] = useState(false);
  const { submissions } = useProgress();
  useEffect(() => setMounted(true), []);

  const rating = PAST[0].rating;
  const virtualSet = PROBLEMS.slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader
        eyebrow="Rated"
        title="Contests"
        description="Rated weeklies, virtual replays of past rounds, and a live leaderboard."
      />

      <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Contest rating" value={rating} sub={`${PAST[0].delta > 0 ? "+" : ""}${PAST[0].delta} last round`} tone="text-amber" />
        <Stat label="Best rank" value={`#${Math.min(...PAST.map((p) => p.rank))}`} sub="of 18,930" />
        <Stat label="Contests" value={PAST.length} sub="attended" />
        <Stat label="Submissions" value={mounted ? submissions.length : 0} sub="all time" tone="text-lime" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <section>
            <SectionTitle>Upcoming</SectionTitle>
            <div className="space-y-2">
              {UPCOMING.map((c) => (
                <Card key={c.id} className="p-4" interactive>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-amber" />
                        <h3 className="text-[15px] font-medium">{c.name}</h3>
                        <Badge tone="amber">rated</Badge>
                      </div>
                      <p className="mt-1 flex items-center gap-3 text-[12.5px] text-ink2">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.when}</span>
                        <span>{c.mins} min</span>
                        <span>{c.problems} problems</span>
                      </p>
                    </div>
                    <Button size="sm">Register</Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>Virtual contest</SectionTitle>
            <Card className="p-4">
              <p className="text-[13px] leading-relaxed text-ink1">
                Run a past contest under real timing against the recorded leaderboard. Your rating
                doesn&apos;t change, but the clock is identical.
              </p>
              <div className="mt-3 divide-y divide-line2 rounded-md border border-line">
                {virtualSet.map((p, i) => (
                  <Link
                    key={p.slug}
                    href={`/problems/${p.slug}`}
                    className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-bg2"
                  >
                    <span className="font-mono text-[11px] text-ink3">Q{i + 1}</span>
                    <span className="flex-1 truncate text-[13px]">{p.title}</span>
                    <span className="font-mono text-[11px] text-ink3">{(i + 1) * 3} pts</span>
                    <span className={cn("w-14 text-right text-[11.5px]", difficultyColor[p.difficulty])}>
                      {p.difficulty}
                    </span>
                  </Link>
                ))}
              </div>
              <Link href={`/problems/${virtualSet[0].slug}`} className="mt-3 inline-block">
                <Button size="sm" variant="primary"><Play className="h-3 w-3" /> Start virtual round</Button>
              </Link>
            </Card>
          </section>

          <section>
            <SectionTitle>Your contest history</SectionTitle>
            <Card className="divide-y divide-line2">
              {PAST.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px]">{c.name}</div>
                    <div className="text-[11px] text-ink3">
                      {c.solved}/{c.total} solved · rank #{c.rank.toLocaleString()} of {c.participants.toLocaleString()}
                    </div>
                  </div>
                  <span className="font-mono text-[13px] text-ink1">{c.rating}</span>
                  <span className={cn("w-10 text-right font-mono text-[12px]", c.delta > 0 ? "text-lime" : "text-coral")}>
                    {c.delta > 0 ? "+" : ""}{c.delta}
                  </span>
                </div>
              ))}
            </Card>
            <p className="mt-2 text-[11px] text-ink3">
              Contest history is seeded demo data — live contests need the backend scheduler.
            </p>
          </section>
        </div>

        <section>
          <SectionTitle
            action={<span className="flex items-center gap-1 text-[11.5px] text-ink3"><Users className="h-3 w-3" /> 18,930</span>}
          >
            Leaderboard — Weekly 46
          </SectionTitle>
          <Card className="divide-y divide-line2">
            <div className="grid grid-cols-[2rem_1fr_3rem_3.5rem] gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-ink3">
              <span>#</span><span>User</span><span className="text-right">Q</span><span className="text-right">Rating</span>
            </div>
            {LEADERS.map((l, i) => (
              <div
                key={l.handle}
                className={cn(
                  "grid grid-cols-[2rem_1fr_3rem_3.5rem] items-center gap-2 px-3 py-2",
                  l.handle === "rishik" && "bg-lime/8",
                )}
              >
                <span className="flex items-center gap-1 font-mono text-[12px] text-ink2">
                  {i < 3 && <Medal className={cn("h-3 w-3", i === 0 ? "text-amber" : i === 1 ? "text-ink1" : "text-coral")} />}
                  {i + 1}
                </span>
                <span className={cn("truncate text-[12.5px]", l.handle === "rishik" ? "text-lime" : "text-ink1")}>
                  {l.handle}
                </span>
                <span className="text-right font-mono text-[12px] text-ink2">{l.solved}</span>
                <span className="text-right font-mono text-[12px] text-ink1">{l.rating}</span>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
