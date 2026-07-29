"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { CircleCheck, CircleDot, Circle, Filter, Search } from "lucide-react";
import { PROBLEMS, ALL_TOPICS, ALL_COMPANIES, type Difficulty } from "@/data/problems";
import { useProgress } from "@/lib/store";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { cn, difficultyColor } from "@/lib/utils";

const DIFFS: (Difficulty | "All")[] = ["All", "Easy", "Medium", "Hard"];

export default function ProblemsPage() {
  const [q, setQ] = useState("");
  const [diff, setDiff] = useState<Difficulty | "All">("All");
  const [topic, setTopic] = useState("All");
  const [company, setCompany] = useState("All");
  const [mounted, setMounted] = useState(false);

  const solved = useProgress((s) => s.solved);
  const attempted = useProgress((s) => s.attempted);
  useEffect(() => setMounted(true), []);

  const filtered = useMemo(
    () =>
      PROBLEMS.filter((p) => {
        if (diff !== "All" && p.difficulty !== diff) return false;
        if (topic !== "All" && !p.topics.includes(topic)) return false;
        if (company !== "All" && !p.companies.includes(company)) return false;
        if (q && !p.title.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [q, diff, topic, company],
  );

  const solvedCount = Object.keys(solved).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader
        eyebrow="Problems"
        title="Practice"
        description={
          mounted
            ? `${solvedCount} of ${PROBLEMS.length} solved · ${PROBLEMS.length - solvedCount} to go`
            : `${PROBLEMS.length} problems across arrays, graphs and dynamic programming`
        }
      />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-sm border border-edge p-0.5">
          {DIFFS.map((d) => (
            <button
              key={d}
              onClick={() => setDiff(d)}
              className={cn(
                "rounded-xs px-2.5 py-1 text-xs font-medium transition-colors",
                diff === d ? "bg-signal text-on-signal" : "text-tertiary hover:text-primary",
              )}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by name…"
            className="h-8 w-44 rounded-sm border border-edge bg-raised pl-8 pr-2.5 text-xs text-primary outline-none placeholder:text-faint focus:border-edge-strong"
          />
        </div>

        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="h-8 rounded-sm border border-edge bg-raised px-2 text-xs text-primary outline-none focus:border-edge-strong"
        >
          <option value="All">All topics</option>
          {ALL_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="h-8 rounded-sm border border-edge bg-raised px-2 text-xs text-primary outline-none focus:border-edge-strong"
        >
          <option value="All">All companies</option>
          {ALL_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <span className="ml-auto flex items-center gap-2 text-xs text-tertiary">
          <Filter className="size-3.5" />
          {filtered.length} shown
          {(topic !== "All" || company !== "All" || q || diff !== "All") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setTopic("All"); setCompany("All"); setQ(""); setDiff("All"); }}
            >
              Clear
            </Button>
          )}
        </span>
      </div>

      <Card className="divide-y divide-hairline overflow-hidden">
        <div className="grid grid-cols-[22px_1fr_auto_4rem] items-center gap-3 bg-sunken/40 px-4 py-2">
          <span />
          <span className="eyebrow">Title</span>
          <span className="eyebrow hidden sm:block">Acceptance</span>
          <span className="eyebrow text-right">Level</span>
        </div>

        {filtered.map((p) => {
          const isSolved = mounted && Boolean(solved[p.slug]);
          const isAttempted = mounted && !isSolved && attempted.includes(p.slug);
          return (
            <Link
              key={p.slug}
              href={`/problems/${p.slug}`}
              className="group grid grid-cols-[22px_1fr_auto_4rem] items-center gap-3 px-4 py-3 transition-colors hover:bg-elevated"
            >
              {isSolved ? (
                <CircleCheck className="size-4 text-signal" />
              ) : isAttempted ? (
                <CircleDot className="size-4 text-warn" />
              ) : (
                <Circle className="size-4 text-faint transition-colors group-hover:text-tertiary" />
              )}
              <div className="min-w-0">
                <div className="truncate text-sm text-primary">{p.title}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {p.topics.slice(0, 3).map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                  <span className="hidden text-2xs text-faint md:inline">
                    {p.companies.slice(0, 3).join(" · ")}
                  </span>
                </div>
              </div>
              <span className="hidden font-mono text-xs tabular-nums text-tertiary sm:block">
                {p.acceptance}%
              </span>
              <span className={cn("text-right text-xs", difficultyColor[p.difficulty])}>
                {p.difficulty}
              </span>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-tertiary">
            No problems match those filters.
          </div>
        )}
      </Card>
    </div>
  );
}
