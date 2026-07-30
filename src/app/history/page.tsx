"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CircleCheck, CircleX, Clock, Mic, MessageSquare, Activity,
  Trash2, ChevronRight, LogIn, Play,
} from "lucide-react";
import { PROBLEMS } from "@/data/problems";
import { useAuth } from "@/lib/auth";
import {
  listSubmissions, listInterviews, listChats, listVisualizations,
  fetchInterview, fetchChat, deleteChat, deleteVisualization,
} from "@/lib/db";
import type {
  SubmissionRow, InterviewSessionRow, AiChatRow, SavedVizRow,
  InterviewMessageRow, AiChatMessageRow,
} from "@/lib/supabase/types";
import { Badge, Button, Card, Empty, Markdown, PageHeader, ScoreBar, Tabs } from "@/components/ui";
import { cn, difficultyColor, fmtTime } from "@/lib/utils";

const TABS = [
  { id: "submissions", label: "Submissions" },
  { id: "interviews", label: "Interviews" },
  { id: "chats", label: "AI Chats" },
  { id: "visualizations", label: "Visualizations" },
];

const VERDICT_TONE: Record<string, string> = {
  Accepted: "text-signal",
  "Wrong Answer": "text-danger",
  "Runtime Error": "text-danger",
  "Compile Error": "text-danger",
  "Time Limit Exceeded": "text-warn",
  "Needs Sandbox": "text-tertiary",
};

const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 172800) return "yesterday";
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function HistoryPage() {
  const { user, loading, configured } = useAuth();
  const [tab, setTab] = useState("submissions");

  const [submissions, setSubmissions] = useState<SubmissionRow[] | null>(null);
  const [interviews, setInterviews] = useState<InterviewSessionRow[] | null>(null);
  const [chats, setChats] = useState<AiChatRow[] | null>(null);
  const [vizzes, setVizzes] = useState<SavedVizRow[] | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [s, i, c, v] = await Promise.all([
      listSubmissions(200), listInterviews(50), listChats(50), listVisualizations(50),
    ]);
    setSubmissions(s);
    setInterviews(i);
    setChats(c);
    setVizzes(v);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <div className="mx-auto max-w-5xl px-5 py-10 text-sm text-tertiary">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <PageHeader
          eyebrow="History"
          title="Sign in to keep your history"
          description={
            configured
              ? "Your submissions, interview transcripts, AI chats and saved visualizations are stored against your account so they survive a cleared cache."
              : "Supabase isn't configured yet, so there's nowhere to store history. Add the env vars from the README and restart."
          }
        />
        {configured && (
          <Link href="/login?next=%2Fhistory">
            <Button variant="primary" size="lg"><LogIn /> Sign in</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <PageHeader
        eyebrow="Your account"
        title="History"
        description="Every attempt, interview, conversation and replay — kept."
      />

      <Tabs
        tabs={TABS.map((t) => ({
          ...t,
          badge: (() => {
            const n = { submissions, interviews, chats, visualizations: vizzes }[
              t.id as "submissions" | "interviews" | "chats" | "visualizations"
            ]?.length;
            return n ? <span className="font-mono text-2xs text-faint">{n}</span> : undefined;
          })(),
        }))}
        active={tab}
        onChange={setTab}
        className="mb-5"
      />

      {tab === "submissions" && <SubmissionsTab rows={submissions} />}
      {tab === "interviews" && <InterviewsTab rows={interviews} />}
      {tab === "chats" && <ChatsTab rows={chats} onDelete={load} />}
      {tab === "visualizations" && <VizTab rows={vizzes} onDelete={load} />}
    </div>
  );
}

/* ── Submissions: grouped per problem so the attempt chain reads well ── */

function SubmissionsTab({ rows }: { rows: SubmissionRow[] | null }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  if (!rows) return <Empty>Loading…</Empty>;
  if (rows.length === 0) {
    return <Empty>No submissions yet. Solve something and it&apos;ll appear here.</Empty>;
  }

  const bySlug = new Map<string, SubmissionRow[]>();
  for (const r of rows) {
    const list = bySlug.get(r.problem_slug) ?? [];
    list.push(r);
    bySlug.set(r.problem_slug, list);
  }

  return (
    <div className="space-y-2">
      {[...bySlug.entries()].map(([slug, attempts]) => {
        const problem = PROBLEMS.find((p) => p.slug === slug);
        const solved = attempts.some((a) => a.status === "Accepted");
        const open = openSlug === slug;
        const latest = attempts[0];

        return (
          <Card key={slug} className="overflow-hidden">
            <button
              onClick={() => setOpenSlug(open ? null : slug)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-elevated"
            >
              {solved ? (
                <CircleCheck className="size-4 shrink-0 text-signal" />
              ) : (
                <CircleX className="size-4 shrink-0 text-danger" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-primary">
                  {problem?.title ?? slug}
                </div>
                <div className="text-2xs text-faint">
                  {attempts.length} attempt{attempts.length === 1 ? "" : "s"} ·{" "}
                  {latest.language} · {ago(latest.created_at)}
                </div>
              </div>
              {problem && (
                <span className={cn("hidden text-xs sm:inline", difficultyColor[problem.difficulty])}>
                  {problem.difficulty}
                </span>
              )}
              <ChevronRight
                className={cn("size-4 shrink-0 text-faint transition-transform", open && "rotate-90")}
              />
            </button>

            {open && (
              <div className="border-t border-hairline bg-sunken/40 px-4 py-3">
                {/* Oldest first so the chain reads Wrong Answer → Accepted */}
                <div className="space-y-0">
                  {[...attempts].reverse().map((a, i, arr) => (
                    <div key={a.id} className="flex gap-3">
                      <div className="flex shrink-0 flex-col items-center">
                        <span
                          className={cn(
                            "mt-1.5 size-2 rounded-full",
                            a.status === "Accepted" ? "bg-signal" : "bg-danger",
                          )}
                        />
                        {i < arr.length - 1 && <span className="w-px flex-1 bg-edge" />}
                      </div>
                      <div className="pb-4">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className={cn("text-sm font-medium", VERDICT_TONE[a.status] ?? "text-secondary")}>
                            {a.status}
                          </span>
                          <span className="font-mono text-2xs tabular-nums text-tertiary">
                            {a.passed}/{a.total} tests
                          </span>
                          {a.runtime_ms != null && (
                            <span className="flex items-center gap-1 font-mono text-2xs text-faint">
                              <Clock className="size-3" /> {Number(a.runtime_ms).toFixed(1)} ms
                            </span>
                          )}
                          {a.duration_sec != null && (
                            <span className="font-mono text-2xs text-faint">
                              solved in {fmtTime(a.duration_sec)}
                            </span>
                          )}
                          <span className="text-2xs text-faint">{ago(a.created_at)}</span>
                        </div>
                        <pre className="mt-1.5 max-h-40 overflow-auto rounded-sm border border-hairline bg-base p-2 font-mono text-2xs leading-relaxed text-secondary">
                          {a.code}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href={`/problems/${slug}`}>
                  <Button size="sm" variant="outline">Open problem <ChevronRight /></Button>
                </Link>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ── Interviews: list + inline transcript replay ────────────────── */

function InterviewsTab({ rows }: { rows: InterviewSessionRow[] | null }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    session: InterviewSessionRow;
    messages: InterviewMessageRow[];
  } | null>(null);

  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    let cancelled = false;
    fetchInterview(openId).then((d) => { if (!cancelled) setDetail(d); });
    return () => { cancelled = true; };
  }, [openId]);

  if (!rows) return <Empty>Loading…</Empty>;
  if (rows.length === 0) {
    return <Empty>No interviews yet. Take a mock and the full transcript is kept here.</Empty>;
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const open = openId === r.id;
        const scores = (r.scores as unknown as { label: string; value: number; note?: string }[]) ?? [];
        return (
          <Card key={r.id} className="overflow-hidden">
            <button
              onClick={() => setOpenId(open ? null : r.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-elevated"
            >
              <Mic className="size-4 shrink-0 text-ai" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-primary">
                  {r.company} · {r.mode.toUpperCase()}
                </div>
                <div className="text-2xs text-faint">
                  {r.verdict} · {fmtTime(r.duration_sec)} · {ago(r.created_at)}
                </div>
              </div>
              <span className="font-display text-xl tabular-nums text-signal">
                {r.overall_score}%
              </span>
              <ChevronRight
                className={cn("size-4 shrink-0 text-faint transition-transform", open && "rotate-90")}
              />
            </button>

            {open && (
              <div className="grid gap-5 border-t border-hairline bg-sunken/40 p-4 lg:grid-cols-[18rem_1fr]">
                <div className="space-y-2.5">
                  {scores.map((s) => (
                    <ScoreBar key={s.label} label={s.label} value={s.value} note={s.note} />
                  ))}
                  {r.recommendations?.length > 0 && (
                    <div className="pt-2">
                      <h4 className="eyebrow mb-1.5">Recommendations</h4>
                      <ul className="space-y-1">
                        {r.recommendations.map((x) => (
                          <li key={x} className="flex gap-2 text-2xs leading-relaxed text-secondary">
                            <span className="text-warn">▸</span> {x}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="eyebrow mb-2 flex items-center gap-1.5">
                    <Play className="size-3" /> Transcript replay
                  </h4>
                  {!detail ? (
                    <p className="text-xs text-tertiary">Loading transcript…</p>
                  ) : detail.messages.length === 0 ? (
                    <p className="text-xs text-tertiary">No transcript stored for this session.</p>
                  ) : (
                    <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
                      {detail.messages.map((m) => (
                        <div
                          key={m.id}
                          className={cn("flex gap-2.5", m.speaker === "candidate" && "flex-row-reverse")}
                        >
                          <span className="mt-0.5 w-10 shrink-0 font-mono text-2xs text-faint">
                            {fmtTime(m.t_seconds)}
                          </span>
                          <div
                            className={cn(
                              "max-w-[80%] rounded-lg px-2.5 py-1.5",
                              m.speaker === "interviewer"
                                ? "border border-hairline bg-raised"
                                : "bg-elevated text-right",
                            )}
                          >
                            {m.speaker === "interviewer" ? (
                              <Markdown text={m.message} />
                            ) : (
                              <span className="text-sm text-primary">{m.message}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ── AI chats ────────────────────────────────────────────────────── */

function ChatsTab({ rows, onDelete }: { rows: AiChatRow[] | null; onDelete: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessageRow[] | null>(null);

  useEffect(() => {
    if (!openId) { setMessages(null); return; }
    let cancelled = false;
    fetchChat(openId).then((d) => { if (!cancelled) setMessages(d?.messages ?? []); });
    return () => { cancelled = true; };
  }, [openId]);

  if (!rows) return <Empty>Loading…</Empty>;
  if (rows.length === 0) {
    return <Empty>No conversations yet. Ask the AI Tutor something and it&apos;s saved here.</Empty>;
  }

  return (
    <div className="space-y-2">
      {rows.map((c) => {
        const open = openId === c.id;
        return (
          <Card key={c.id} className="overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <MessageSquare className="size-4 shrink-0 text-ai" />
              <button
                onClick={() => setOpenId(open ? null : c.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate text-sm text-primary">{c.title}</div>
                <div className="text-2xs text-faint">
                  {c.problem_slug ? `${c.problem_slug} · ` : ""}{ago(c.updated_at)}
                </div>
              </button>
              <button
                onClick={async () => { await deleteChat(c.id); onDelete(); }}
                className="text-faint transition-colors hover:text-danger"
                aria-label="Delete chat"
              >
                <Trash2 className="size-3.5" />
              </button>
              <ChevronRight
                onClick={() => setOpenId(open ? null : c.id)}
                className={cn("size-4 shrink-0 cursor-pointer text-faint transition-transform", open && "rotate-90")}
              />
            </div>

            {open && (
              <div className="space-y-3 border-t border-hairline bg-sunken/40 p-4">
                {!messages ? (
                  <p className="text-xs text-tertiary">Loading…</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={cn(m.role === "user" && "flex justify-end")}>
                      {m.role === "user" ? (
                        <div className="max-w-[85%] rounded-lg rounded-br-xs bg-elevated px-2.5 py-1.5 text-sm text-primary">
                          {m.content}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-hairline bg-raised px-3 py-2.5">
                          <Markdown text={m.content} />
                          {m.source === "local" && (
                            <div className="mt-1.5 text-2xs text-faint">built-in engine</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ── Saved visualizations ────────────────────────────────────────── */

function VizTab({ rows, onDelete }: { rows: SavedVizRow[] | null; onDelete: () => void }) {
  if (!rows) return <Empty>Loading…</Empty>;
  if (rows.length === 0) {
    return (
      <Empty>
        Nothing saved. Open the <Link href="/visualize" className="text-signal hover:underline">visualizer</Link>{" "}
        and hit Save to keep a run you can replay later.
      </Empty>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((v) => {
        const input = Array.isArray(v.input) ? (v.input as number[]) : [];
        return (
          <Card key={v.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Activity className="size-3.5 shrink-0 text-signal" />
                  <span className="truncate text-sm text-primary">{v.algorithm_name}</span>
                </div>
                <div className="mt-1 text-2xs text-faint">
                  {v.step_count} steps · {ago(v.created_at)}
                </div>
              </div>
              <button
                onClick={async () => { await deleteVisualization(v.id); onDelete(); }}
                className="shrink-0 text-faint transition-colors hover:text-danger"
                aria-label="Delete visualization"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>

            {v.note && <p className="mt-2 text-xs text-secondary">{v.note}</p>}

            <div className="mt-3 flex h-10 items-end gap-px">
              {input.slice(0, 40).map((n, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-[1px] bg-edge-strong"
                  style={{ height: `${(n / Math.max(1, ...input)) * 100}%` }}
                />
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Link href={`/visualize?algo=${v.algorithm_id}&input=${encodeURIComponent(JSON.stringify(input))}`}>
                <Button size="sm" variant="outline"><Play /> Replay</Button>
              </Link>
              <Badge>{v.algorithm_id}</Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
