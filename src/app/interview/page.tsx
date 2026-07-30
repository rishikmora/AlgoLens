"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Mic, MicOff, FileText, Code2, MessageSquare, ArrowRight, Volume2, Upload, TriangleAlert,
} from "lucide-react";
import { PACKS } from "@/data/companies";
import { PROBLEMS } from "@/data/problems";
import { useInterviewSetup, extractProjects } from "@/lib/interviewSetup";
import { useProgress } from "@/lib/store";
import { useUserId } from "@/lib/auth";
import { saveResume } from "@/lib/db";
import { Badge, Button, Card, PageHeader, SectionTitle } from "@/components/ui";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "dsa", label: "DSA / Coding", icon: Code2, desc: "One problem, live coding, follow-ups on complexity and edge cases." },
  { id: "behavioral", label: "Behavioral", icon: MessageSquare, desc: "STAR-format questions scored on structure, clarity and confidence." },
  { id: "resume", label: "Resume-based", icon: FileText, desc: "Paste your resume — the interviewer asks about your actual projects." },
] as const;

export default function InterviewSetupPage() {
  const { packId, mode, problemSlug, voice, resumeText, set } = useInterviewSetup();
  const { name, interviews } = useProgress();
  const [mounted, setMounted] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const userId = useUserId();

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const p = params.get("pack");
    if (p && PACKS.some((x) => x.id === p)) set({ packId: p });
  }, [set]);

  const pack = PACKS.find((p) => p.id === packId)!;
  const projects = extractProjects(resumeText);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageHeader
        eyebrow={`${PACKS.length} company packs`}
        title="Mock Interviews"
        description="A real interview shape: introduction, problem, silent observation, interruptions, optimization pressure, follow-ups, behavioral, feedback. The interviewer reacts to what you actually write and say — including your silences."
      />

      {/* Company packs */}
      <section className="mb-6">
        <SectionTitle>1 · Choose your interviewer</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PACKS.map((p) => (
            <button
              key={p.id}
              onClick={() => set({ packId: p.id })}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                packId === p.id
                  ? "border-lime bg-lime/8"
                  : "border-line bg-bg1 hover:border-bg4 hover:bg-bg2",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-medium" style={{ color: p.accent }}>
                  {p.name}
                </span>
                <span className="font-mono text-[11px] text-ink3">{p.questionCount}q</span>
              </div>
              <p className="mt-1 text-[11.5px] text-ink2">{p.focus.slice(0, 3).join(" · ")}</p>
            </button>
          ))}
        </div>

        <Card className="mt-3 p-3">
          <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-[12px] uppercase tracking-[0.12em] text-ink3">Interviewer persona</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink1">{pack.persona}</p>
            </div>
            <div>
              <h3 className="mb-1 text-[12px] uppercase tracking-[0.12em] text-ink3">Signals scored</h3>
              <div className="flex flex-wrap gap-1">
                {pack.signals.map((s) => <Badge key={s} tone="violet">{s}</Badge>)}
              </div>
              <h3 className="mb-1 mt-2.5 text-[12px] uppercase tracking-[0.12em] text-ink3">Rounds</h3>
              <div className="flex flex-wrap items-center gap-1 text-[11.5px] text-ink2">
                {pack.rounds.map((r, i) => (
                  <span key={r} className="flex items-center gap-1">
                    {r}
                    {i < pack.rounds.length - 1 && <span className="text-ink3">→</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Mode */}
      <section className="mb-6">
        <SectionTitle>2 · Interview type</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-3">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => set({ mode: m.id })}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  mode === m.id ? "border-lime bg-lime/8" : "border-line bg-bg1 hover:border-bg4",
                )}
              >
                <Icon className={cn("h-4 w-4", mode === m.id ? "text-lime" : "text-ink2")} />
                <div className="mt-1.5 text-[13.5px] font-medium">{m.label}</div>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink2">{m.desc}</p>
              </button>
            );
          })}
        </div>

        {mode === "dsa" && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] text-ink2">Problem:</span>
            <select
              value={problemSlug}
              onChange={(e) => set({ problemSlug: e.target.value })}
              className="rounded-sm border border-line bg-bg1 px-2 py-1.5 text-[12.5px] outline-none focus:border-bg4"
            >
              {PROBLEMS.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title} — {p.difficulty}
                </option>
              ))}
            </select>
            <span className="text-[11.5px] text-ink3">
              Difficulty adapts after the round based on how you do.
            </span>
          </div>
        )}

        {mode === "resume" && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".txt,.md,.markdown,.json,.csv"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadError(null);
                    if (/\.pdf$/i.test(file.name)) {
                      setUploadError("PDF text extraction needs the backend parser. Open the PDF, copy the text, and paste it below.");
                      return;
                    }
                    if (file.size > 400_000) {
                      setUploadError("That file is larger than 400 KB — paste the relevant sections instead.");
                      return;
                    }
                    const text = await file.text();
                    set({ resumeText: text });
                    // Keep a versioned copy so past interviews stay reproducible.
                    if (userId) {
                      void saveResume({
                        userId,
                        content: text,
                        filename: file.name,
                        projects: extractProjects(text),
                      });
                    }
                  }}
                />
                <span className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-edge bg-elevated px-3 text-sm font-medium text-primary transition-colors hover:border-edge-strong hover:bg-hover">
                  <Upload className="size-3.5" /> Upload resume
                </span>
              </label>
              <span className="text-2xs text-faint">.txt / .md — or paste below</span>
              {resumeText && (
                <Button size="sm" variant="ghost" onClick={() => set({ resumeText: "" })}>
                  Clear
                </Button>
              )}
            </div>

            {uploadError && (
              <p className="flex items-start gap-1.5 rounded-sm border border-warn/30 bg-warn/10 p-2 text-xs text-warn">
                <TriangleAlert className="mt-px size-3.5 shrink-0" /> {uploadError}
              </p>
            )}

            <textarea
              value={resumeText}
              onChange={(e) => set({ resumeText: e.target.value })}
              rows={6}
              placeholder="Paste your resume text here — the interviewer will ask about the projects it finds."
              className="w-full rounded-md border border-edge bg-sunken p-3 text-xs leading-relaxed text-primary outline-none focus:border-edge-strong"
            />
            {projects.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-2xs text-faint">Detected projects:</span>
                {projects.map((p) => <Badge key={p} tone="mint">{p}</Badge>)}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Voice */}
      <section className="mb-6">
        <SectionTitle>3 · Voice</SectionTitle>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => set({ voice: !voice })}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] transition-colors",
              voice ? "border-lime bg-lime/8 text-lime" : "border-line bg-bg1 text-ink2",
            )}
          >
            {voice ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {voice ? "Voice interview on" : "Text only"}
          </button>
          <p className="max-w-md text-[11.5px] leading-relaxed text-ink3">
            <Volume2 className="mr-1 inline h-3 w-3" />
            The interviewer speaks aloud and your microphone answers are transcribed and scored for
            communication. Uses your browser&apos;s built-in speech APIs — works best in Chrome or Edge.
            You can always type instead.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Link href="/interview/session">
          <Button variant="primary">
            Start interview as {mounted ? name : "candidate"} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <span className="text-[12px] text-ink3">
          {pack.name} · {MODES.find((m) => m.id === mode)?.label} · ~45 min
        </span>
      </div>

      {mounted && interviews.length > 0 && (
        <section className="mt-8">
          <SectionTitle>Past interviews</SectionTitle>
          <Card className="divide-y divide-line2">
            {interviews.slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <Mic className="h-3.5 w-3.5 shrink-0 text-violet" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px]">{r.packName} · {r.mode}</div>
                  <div className="text-[11px] text-ink3">
                    {r.report.verdict} · {Math.round(r.durationSec / 60)} min ·{" "}
                    {new Date(r.at).toLocaleDateString()}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[13px] text-lime">{r.report.overall}%</span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
