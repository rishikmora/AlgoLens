"use client";

import { useEffect, useState } from "react";
import { Database, Users, Trophy, Flag, Brain, ChartNoAxesColumn, Lock } from "lucide-react";
import { PROBLEMS, ALL_TOPICS, ALL_COMPANIES } from "@/data/problems";
import { PACKS, BEHAVIORAL_QUESTIONS, DSA_FOLLOWUPS } from "@/data/companies";
import { ALGOS } from "@/lib/algos";
import { aiStatus } from "@/lib/ai/client";
import { Badge, Card, PageHeader, SectionTitle, Stat, Tabs } from "@/components/ui";
import { cn, difficultyColor } from "@/lib/utils";

const TABS = [
  { id: "problems", label: "Problems" },
  { id: "banks", label: "Question banks" },
  { id: "packs", label: "Interview packs" },
  { id: "models", label: "AI models" },
  { id: "analytics", label: "Analytics" },
];

export default function AdminPage() {
  const [tab, setTab] = useState("problems");
  const [ai, setAi] = useState<{ configured: boolean; model: string | null; note: string } | null>(null);

  useEffect(() => { aiStatus().then(setAi); }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader
        eyebrow="Internal"
        title="Admin"
        description="Content and model configuration."
        actions={
          <span className="flex items-center gap-1.5 rounded-sm border border-warn/30 bg-warn/10 px-2 py-1 text-xs text-warn">
            <Lock className="size-3" /> Read-only — writes need the backend + auth
          </span>
        }
      />

      <div className="mb-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Problems" value={PROBLEMS.length} tone="text-lime" />
        <Stat label="Test cases" value={PROBLEMS.reduce((a, p) => a + p.tests.length, 0)} />
        <Stat label="Topics" value={ALL_TOPICS.length} />
        <Stat label="Companies" value={ALL_COMPANIES.length} />
        <Stat label="Visualizers" value={ALGOS.length} tone="text-violet" />
        <Stat label="Packs" value={PACKS.length} tone="text-amber" />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-4" />

      {tab === "problems" && (
        <Card className="divide-y divide-line2">
          <div className="grid grid-cols-[1fr_5rem_5rem_4rem_5rem] gap-2 px-3.5 py-2 text-[10px] uppercase tracking-[0.12em] text-ink3">
            <span>Title</span><span>Difficulty</span><span>Tests</span><span>Viz</span><span>Acceptance</span>
          </div>
          {PROBLEMS.map((p) => (
            <div key={p.slug} className="grid grid-cols-[1fr_5rem_5rem_4rem_5rem] items-center gap-2 px-3.5 py-2">
              <div className="min-w-0">
                <div className="truncate text-[13px]">{p.title}</div>
                <div className="truncate text-[11px] text-ink3">{p.slug} · fn {p.fn}()</div>
              </div>
              <span className={cn("text-[12px]", difficultyColor[p.difficulty])}>{p.difficulty}</span>
              <span className="font-mono text-[12px] text-ink2">{p.tests.length}</span>
              <span className="text-[11px]">{p.viz ? <Badge tone="violet">{p.viz}</Badge> : <span className="text-ink3">—</span>}</span>
              <span className="font-mono text-[12px] text-ink2">{p.acceptance}%</span>
            </div>
          ))}
        </Card>
      )}

      {tab === "banks" && (
        <div className="grid gap-4 md:grid-cols-2">
          <section>
            <SectionTitle>Behavioral bank ({BEHAVIORAL_QUESTIONS.length})</SectionTitle>
            <Card className="divide-y divide-line2">
              {BEHAVIORAL_QUESTIONS.map((q) => (
                <div key={q} className="px-3 py-2 text-[12.5px] text-ink1">{q}</div>
              ))}
            </Card>
          </section>
          <section>
            <SectionTitle>DSA follow-up bank ({DSA_FOLLOWUPS.length})</SectionTitle>
            <Card className="divide-y divide-line2">
              {DSA_FOLLOWUPS.map((q) => (
                <div key={q} className="px-3 py-2 text-[12.5px] text-ink1">{q}</div>
              ))}
            </Card>
          </section>
        </div>
      )}

      {tab === "packs" && (
        <div className="grid gap-3 md:grid-cols-2">
          {PACKS.map((p) => (
            <Card key={p.id} className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium" style={{ color: p.accent }}>{p.name}</span>
                <span className="font-mono text-[11px] text-ink3">{p.questionCount} questions</span>
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink2">{p.persona}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.signals.map((s) => <Badge key={s} tone="violet">{s}</Badge>)}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "models" && (
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-start gap-2.5">
              <Brain className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
              <div>
                <h3 className="text-[13.5px] font-medium">Tutor &amp; interviewer model</h3>
                <p className="mt-1 text-[12.5px] text-ink2">{ai?.note ?? "Checking…"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone={ai?.configured ? "lime" : "amber"}>
                    {ai?.configured ? "Claude connected" : "built-in engine"}
                  </Badge>
                  {ai?.model && <Badge tone="azure">{ai.model}</Badge>}
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-[13.5px] font-medium">Deterministic subsystems</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink2">
              These never call a model, so their output is reproducible:
            </p>
            <ul className="mt-2 space-y-1 text-[12.5px] text-ink1">
              <li>• Code review scoring — static analysis of the submitted source</li>
              <li>• Interview report scoring — measured session signals</li>
              <li>• Visualizer traces — algorithms executed locally, step-recorded</li>
              <li>• Visual debugger — the built-in AST interpreter</li>
            </ul>
          </Card>
        </div>
      )}

      {tab === "analytics" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <SectionTitle>Problems per topic</SectionTitle>
            <div className="space-y-1.5">
              {ALL_TOPICS.map((t) => {
                const n = PROBLEMS.filter((p) => p.topics.includes(t)).length;
                return (
                  <div key={t} className="flex items-center gap-2">
                    <span className="w-32 shrink-0 truncate text-[12px] text-ink1">{t}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg3">
                      <div className="h-full rounded-full bg-teal" style={{ width: `${(n / PROBLEMS.length) * 100}%` }} />
                    </div>
                    <span className="w-5 text-right font-mono text-[11px] text-ink3">{n}</span>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="p-4">
            <SectionTitle>Coverage gaps</SectionTitle>
            <ul className="space-y-1.5 text-[12.5px] text-ink1">
              <li className="flex gap-2"><Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral" /> No Hard problems in the seed set</li>
              <li className="flex gap-2"><Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" /> Trees, Heap, Trie have no problems yet</li>
              <li className="flex gap-2"><Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-azure" /> User &amp; contest tables need Postgres</li>
              <li className="flex gap-2"><Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-azure" /> User management needs auth</li>
              <li className="flex gap-2"><Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-azure" /> Live contests need the scheduler</li>
              <li className="flex gap-2"><ChartNoAxesColumn className="mt-0.5 h-3.5 w-3.5 shrink-0 text-azure" /> Platform-wide analytics need telemetry</li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
