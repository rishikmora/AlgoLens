"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Code2, Briefcase, FileText, Share2, Check, Globe } from "lucide-react";
import { PROBLEMS, type Difficulty } from "@/data/problems";
import { useProgress, levelFor, BADGES, earnedBadges } from "@/lib/store";
import { Badge, Button, Card, SectionTitle, Stat } from "@/components/ui";
import { cn } from "@/lib/utils";

const DIFFS: Difficulty[] = ["Easy", "Medium", "Hard"];

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const st = useProgress();
  useEffect(() => setMounted(true), []);

  const lvl = levelFor(st.xp);
  const badges = earnedBadges(st);
  const solvedCount = Object.keys(st.solved).length;
  const bestInterview = st.interviews.reduce((a, r) => Math.max(a, r.report.overall), 0);

  const heat = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of st.submissions) {
      counts.set(new Date(s.at).toISOString().slice(0, 10), (counts.get(new Date(s.at).toISOString().slice(0, 10)) ?? 0) + 1);
    }
    return Array.from({ length: 119 }, (_, i) => {
      const d = new Date(Date.now() - (118 - i) * 86400000).toISOString().slice(0, 10);
      return { date: d, count: counts.get(d) ?? 0 };
    });
  }, [st.submissions]);

  function share() {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!mounted) return <div className="mx-auto max-w-5xl px-4 py-6 text-[13px] text-ink3">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-lime font-mono text-2xl font-bold text-black">
              {st.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <input
                value={st.name}
                onChange={(e) => st.setName(e.target.value)}
                className="w-48 border-b border-transparent bg-transparent text-xl text-ink0 outline-none hover:border-line focus:border-lime"
              />
              <p className="mt-0.5 text-[13px] text-ink2">
                Level {lvl.level} · {lvl.name} · {st.xp} XP
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <a href="https://github.com" target="_blank" rel="noreferrer">
                  <Badge><Code2 className="h-2.5 w-2.5" /> GitHub</Badge>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer">
                  <Badge><Briefcase className="h-2.5 w-2.5" /> LinkedIn</Badge>
                </a>
                <Badge><FileText className="h-2.5 w-2.5" /> Resume</Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Button size="sm" onClick={share}>
              {copied ? <Check className="h-3.5 w-3.5 text-lime" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? "Link copied" : "Share profile"}
            </Button>
            <span className="flex items-center gap-1 text-[11px] text-ink3">
              <Globe className="h-3 w-3" /> public recruiter view
            </span>
          </div>
        </div>
      </Card>

      <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Problems solved" value={solvedCount} sub={`of ${PROBLEMS.length}`} tone="text-lime" />
        <Stat label="Best interview" value={bestInterview ? `${bestInterview}%` : "—"} sub={`${st.interviews.length} taken`} tone="text-violet" />
        <Stat label="Contest rating" value={1687} sub="top 12%" tone="text-amber" />
        <Stat label="Streak" value={st.streak} sub="days" tone="text-coral" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle>Solved breakdown</SectionTitle>
          <Card className="space-y-3 p-4">
            {DIFFS.map((d) => {
              const done = Object.values(st.solved).filter((x) => x === d).length;
              const total = PROBLEMS.filter((p) => p.difficulty === d).length;
              return (
                <div key={d}>
                  <div className="mb-1 flex justify-between text-[12.5px]">
                    <span className="text-ink1">{d}</span>
                    <span className="font-mono text-ink2">{done}/{total}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-bg3">
                    <div
                      className={cn("h-full rounded-full", d === "Easy" ? "bg-teal" : d === "Medium" ? "bg-amber" : "bg-coral")}
                      style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        </section>

        <section>
          <SectionTitle>Achievements</SectionTitle>
          <Card className="grid grid-cols-2 gap-2 p-4">
            {BADGES.map((b) => (
              <div
                key={b.id}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-2 py-1.5",
                  badges.has(b.id) ? "border-lime/30 bg-lime/8" : "border-line opacity-40",
                )}
              >
                <span>{b.icon}</span>
                <span className="truncate text-[12px]">{b.name}</span>
              </div>
            ))}
          </Card>
        </section>
      </div>

      <section className="mt-6">
        <SectionTitle>Activity</SectionTitle>
        <Card className="p-4">
          <div className="flex flex-wrap gap-[3px]">
            {heat.map((d) => (
              <span
                key={d.date}
                title={`${d.date}: ${d.count}`}
                className={cn(
                  "h-3 w-3 rounded-[2px]",
                  d.count === 0 ? "bg-bg3" : d.count < 2 ? "bg-lime/30" : d.count < 4 ? "bg-lime/60" : "bg-lime",
                )}
              />
            ))}
          </div>
        </Card>
      </section>

      {st.interviews.length > 0 && (
        <section className="mt-6">
          <SectionTitle>Interview record</SectionTitle>
          <Card className="divide-y divide-line2">
            {st.interviews.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px]">{r.packName} · {r.mode}</div>
                  <div className="text-[11px] text-ink3">{r.report.verdict}</div>
                </div>
                <div className="flex gap-1">
                  {r.report.scores.slice(0, 3).map((s) => (
                    <span key={s.label} className="hidden font-mono text-[11px] text-ink3 sm:inline">
                      {s.label.slice(0, 4)} {s.value}
                    </span>
                  ))}
                </div>
                <span className="font-mono text-[13px] text-lime">{r.report.overall}%</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <p className="mt-6 text-[11.5px] text-ink3">
        This page reads from your local progress. Sharing a real public URL needs auth and the
        backend — see the README. <Link href="/dashboard" className="text-lime hover:underline">Back to dashboard</Link>
      </p>
    </div>
  );
}
