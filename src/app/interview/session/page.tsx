"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Mic, MicOff, Volume2, VolumeX, Play, SkipForward, Square,
  User, Bot, Clock, TriangleAlert, RotateCcw, Send, Sparkles,
} from "lucide-react";
import { packById } from "@/data/companies";
import { problemBySlug, type Problem } from "@/data/problems";
import { judge } from "@/lib/judge";
import { askInterviewer } from "@/lib/ai/client";
import {
  STAGE_ORDER, STAGE_LABEL, buildReport, emptyMetrics, liveNudge,
  scanCandidateSpeech, nextDifficulty,
  type Stage, type Turn, type SessionMetrics, type InterviewReport,
} from "@/lib/ai/interview";
import { useInterviewSetup, extractProjects } from "@/lib/interviewSetup";
import { useProgress } from "@/lib/store";
import { useSpeech, useMicrophone, speakableText } from "@/lib/speech";
import CodeEditor from "@/components/CodeEditor";
import { Badge, Button, Card, PageHeader, ScoreBar, Markdown } from "@/components/ui";
import { cn, fmtTime } from "@/lib/utils";

export default function InterviewSessionPage() {
  const setup = useInterviewSetup();
  const { name, recordInterview } = useProgress();

  const pack = packById(setup.packId)!;
  const problem: Problem | undefined =
    setup.mode === "dsa" ? problemBySlug(setup.problemSlug) : undefined;

  const [stage, setStage] = useState<Stage>("welcome");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [metrics, setMetrics] = useState<SessionMetrics>(emptyMetrics());
  const [elapsed, setElapsed] = useState(0);
  const [code, setCode] = useState(problem?.starter.javascript ?? "");
  const [thinking, setThinking] = useState(false);
  const [nudge, setNudge] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [voiceOn, setVoiceOn] = useState(setup.voice);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [replayId, setReplayId] = useState<string | null>(null);

  const started = useRef(false);
  const lastActivity = useRef(Date.now());
  const firstCodeAt = useRef<number | null>(null);
  const questionIndex = useRef(0);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;

  const { speak, stop: stopSpeaking, speaking, supported: ttsSupported } = useSpeech();

  const addTurn = useCallback((role: Turn["role"], text: string, atStage: Stage) => {
    setTurns((t) => [
      ...t,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, text, t: elapsedRef.current, stage: atStage },
    ]);
  }, []);

  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  // ── Candidate speech (mic or typed) ───────────────────────────────
  const handleCandidate = useCallback((text: string) => {
    if (!text.trim()) return;
    lastActivity.current = Date.now();
    setNudge(null);
    addTurn("candidate", text, stage);
    setMetrics((m) => scanCandidateSpeech(text, m));
  }, [addTurn, stage]);

  const mic = useMicrophone(handleCandidate);

  // ── Timer + silence watchdog ──────────────────────────────────────
  useEffect(() => {
    if (report) return;
    const id = setInterval(() => {
      setElapsed((e) => e + 1);
      const silence = (Date.now() - lastActivity.current) / 1000;
      setMetrics((m) => ({
        ...m,
        elapsed: elapsedRef.current,
        longestSilence: Math.max(m.longestSilence, silence),
        codeLength: code.trim().length,
      }));
      const n = liveNudge({ ...metricsRef.current, codeLength: code.trim().length }, silence, stage);
      if (n) setNudge(n);
    }, 1000);
    return () => clearInterval(id);
  }, [stage, code, report]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, thinking]);

  useEffect(() => {
    if (code.trim().length > 20 && firstCodeAt.current === null) {
      firstCodeAt.current = elapsedRef.current;
      setMetrics((m) => ({ ...m, timeToFirstCode: elapsedRef.current }));
    }
  }, [code]);

  // ── Ask the interviewer for their next line ───────────────────────
  const fetchLine = useCallback(async (toStage: Stage) => {
    setThinking(true);
    setNudge(null);
    const lastCandidate = [...turnsRef.current].reverse().find((t) => t.role === "candidate");
    const res = await askInterviewer({
      stage: toStage,
      interviewMode: setup.mode,
      packId: setup.packId,
      problemSlug: problem?.slug,
      candidateName: name,
      questionIndex: questionIndex.current,
      resumeProjects: extractProjects(setup.resumeText),
      metrics: metricsRef.current,
      lastCandidateTurn: lastCandidate?.text,
      code: code.trim() || undefined,
    });
    setThinking(false);
    addTurn("interviewer", res.text, toStage);
    lastActivity.current = Date.now();
    if (voiceOn && ttsSupported) speak(res.text);
  }, [setup, problem, name, code, addTurn, speak, voiceOn, ttsSupported]);

  const turnsRef = useRef(turns);
  turnsRef.current = turns;

  const advance = useCallback(() => {
    const i = STAGE_ORDER.indexOf(stage);
    const next = STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, i + 1)];
    if (next === "followup" || next === "behavioral") questionIndex.current += 1;
    setStage(next);
    if (next !== "done") fetchLine(next);
  }, [stage, fetchLine]);

  // Kick things off once.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetchLine("welcome");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runTests() {
    if (!problem) return;
    setTestStatus("Running…");
    const res = await judge("javascript", code, problem.fn, problem.tests);
    setMetrics((m) => ({ ...m, testsPassed: res.passed, testsTotal: res.total }));
    setTestStatus(
      res.message ?? `${res.verdict} — ${res.passed}/${res.total} tests passed`,
    );
    lastActivity.current = Date.now();
  }

  function endInterview() {
    stopSpeaking();
    mic.stop();
    const finalMetrics = { ...metricsRef.current, elapsed, codeLength: code.trim().length };
    const r = buildReport(finalMetrics, setup.mode);
    setReport(r);
    setStage("done");
    recordInterview({
      id: `${Date.now()}`,
      packId: pack.id,
      packName: pack.name,
      mode: setup.mode,
      problemSlug: problem?.slug,
      report: r,
      durationSec: elapsed,
      at: Date.now(),
    });
  }

  const stageIdx = STAGE_ORDER.indexOf(stage);

  // ── Report view ───────────────────────────────────────────────────
  if (report) {
    return (
      <ReportView
        report={report}
        turns={turns}
        elapsed={elapsed}
        packName={pack.name}
        problem={problem}
        metrics={metrics}
        replayId={replayId}
        onReplay={(t) => {
          setReplayId(t.id);
          if (ttsSupported) speak(t.text);
        }}
      />
    );
  }

  // ── Live view ─────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-3rem)] min-h-0 flex-col">
      {/* Status bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2">
        <span className="flex items-center gap-1.5 text-[14px] font-medium" style={{ color: pack.accent }}>
          <Bot className="h-4 w-4" /> {pack.name}
        </span>
        <Badge tone="violet">{setup.mode.toUpperCase()}</Badge>

        <div className="hidden items-center gap-1 md:flex">
          {STAGE_ORDER.slice(0, -1).map((s, i) => (
            <span
              key={s}
              className={cn(
                "rounded-xs px-1.5 py-0.5 text-[10.5px] transition-colors",
                i === stageIdx ? "bg-lime text-black" : i < stageIdx ? "text-lime" : "text-ink3",
              )}
            >
              {STAGE_LABEL[s]}
            </span>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1 font-mono text-[13px] tabular-nums text-ink1">
            <Clock className="h-3.5 w-3.5 text-ink3" /> {fmtTime(elapsed)}
          </span>
          <Button size="sm" variant="ghost" onClick={() => { setVoiceOn((v) => !v); stopSpeaking(); }}>
            {voiceOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="danger" onClick={endInterview}>
            <Square className="h-3 w-3" /> End & get feedback
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,26rem)_1fr]">
        {/* Interviewer */}
        <div className="flex min-h-0 flex-col border-r border-line">
          <div ref={transcriptRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {turns.map((t) => (
              <div key={t.id} className={cn("flex gap-2", t.role === "candidate" && "flex-row-reverse")}>
                <span
                  className={cn(
                    "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                    t.role === "interviewer" ? "border-violet/40 bg-violet/10 text-violet" : "border-line bg-bg3 text-ink2",
                  )}
                >
                  {t.role === "interviewer" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                </span>
                <div className={cn("max-w-[85%]", t.role === "candidate" && "text-right")}>
                  <div className="mb-0.5 font-mono text-[10px] text-ink3">{fmtTime(t.t)}</div>
                  {t.role === "interviewer" ? (
                    <div className="rounded-md border border-line bg-bg1 p-2.5">
                      <Markdown text={t.text} />
                    </div>
                  ) : (
                    <div className="inline-block rounded-md bg-bg3 px-2.5 py-1.5 text-left text-[13px] text-ink0">
                      {t.text}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex items-center gap-2 text-[12px] text-ink3">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet" />
                {speaking ? "speaking…" : "the interviewer is thinking…"}
              </div>
            )}

            {mic.interim && (
              <div className="text-right text-[12.5px] italic text-ink3">{mic.interim}…</div>
            )}
          </div>

          {/* Live nudge */}
          {nudge && (
            <div className="rise mx-3 mb-2 flex shrink-0 items-start gap-2 rounded-md border border-amber/30 bg-amber/8 p-2.5">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" />
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.12em] text-amber">Live feedback</div>
                <p className="text-[12.5px] text-ink1">{nudge}</p>
              </div>
            </div>
          )}

          {mic.error && (
            <div className="mx-3 mb-2 flex shrink-0 items-start gap-2 rounded-md border border-coral/30 bg-coral/8 p-2.5 text-[12px] text-ink1">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral" />
              {mic.error}
            </div>
          )}

          {/* Controls */}
          <div className="shrink-0 border-t border-line p-2">
            <div className="mb-2 flex items-center gap-1.5">
              <Button
                size="sm"
                variant={mic.listening ? "danger" : "default"}
                onClick={() => (mic.listening ? mic.stop() : mic.start())}
                disabled={!mic.supported}
                title={mic.supported ? "Toggle microphone" : "Speech recognition unavailable in this browser"}
              >
                {mic.listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                {mic.listening ? "Stop" : "Speak"}
              </Button>
              <Button size="sm" onClick={advance} disabled={thinking || stage === "done"}>
                <SkipForward className="h-3.5 w-3.5" /> Next
              </Button>
              {turns.length > 0 && ttsSupported && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const last = [...turns].reverse().find((t) => t.role === "interviewer");
                    if (last) speak(last.text);
                  }}
                >
                  <Play className="h-3.5 w-3.5" /> Repeat
                </Button>
              )}
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); handleCandidate(typed); setTyped(""); }}
              className="flex items-center gap-2 rounded-sm border border-line bg-bg0 px-2 py-1"
            >
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Type your answer (or use the mic)"
                className="flex-1 bg-transparent text-[13px] text-ink0 outline-none placeholder:text-ink3"
              />
              <button type="submit" disabled={!typed.trim()} className="text-lime disabled:opacity-30">
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Candidate workspace */}
        <div className="flex min-h-0 flex-col">
          {problem ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-1.5">
                <span className="text-[13px] font-medium">{problem.title}</span>
                <Badge>{problem.difficulty}</Badge>
                <div className="ml-auto flex items-center gap-1.5">
                  {testStatus && <span className="text-[11.5px] text-ink2">{testStatus}</span>}
                  <Button size="sm" onClick={runTests}>
                    <Play className="h-3.5 w-3.5" /> Run tests
                  </Button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <CodeEditor value={code} lang="javascript" onChange={setCode} onRun={runTests} />
              </div>
              <div className="shrink-0 border-t border-line px-3 py-1.5 text-[11px] text-ink3">
                Next difficulty if you finish clean:{" "}
                <span className="text-lime">{nextDifficulty(problem.difficulty, metrics)}</span>
                {" · "}the interviewer can see this editor.
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col p-4">
              <h3 className="text-[13px] uppercase tracking-[0.12em] text-ink3">Your notes</h3>
              <p className="mt-1 text-[12.5px] text-ink2">
                {setup.mode === "behavioral"
                  ? "Jot down STAR structure before you answer: Situation, Task, Action, Result."
                  : "Sketch the points you want to hit about each project."}
              </p>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="S —&#10;T —&#10;A —&#10;R —"
                className="mt-3 min-h-0 flex-1 resize-none rounded-md border border-line bg-bg0 p-3 font-mono text-[13px] text-ink0 outline-none focus:border-bg4"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Report ──────────────────────────────────────────────────────────

function ReportView({
  report, turns, elapsed, packName, problem, metrics, replayId, onReplay,
}: {
  report: InterviewReport;
  turns: Turn[];
  elapsed: number;
  packName: string;
  problem?: Problem;
  metrics: SessionMetrics;
  replayId: string | null;
  onReplay: (t: Turn) => void;
}) {
  const milestones = useMemo(() => {
    const seen = new Set<Stage>();
    return turns.filter((t) => {
      if (t.role !== "interviewer" || seen.has(t.stage)) return false;
      seen.add(t.stage);
      return true;
    });
  }, [turns]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageHeader
        eyebrow={packName}
        title="Interview report"
        description={`${fmtTime(elapsed)} · ${turns.filter((t) => t.role === "candidate").length} responses${problem ? ` · ${problem.title}` : ""}`}
        actions={
          <>
            <Link href="/interview"><Button><RotateCcw /> New interview</Button></Link>
            <Link href="/dashboard"><Button variant="primary">View dashboard</Button></Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="p-4">
          <div className="mb-4 flex items-baseline gap-3">
            <span className="font-display text-5xl leading-none tabular-nums text-signal">
              {report.overall}%
            </span>
            <div>
              <div className="text-base text-primary">{report.verdict}</div>
              <div className="text-2xs text-faint">overall interview score</div>
            </div>
          </div>
          <div className="space-y-2.5">
            {report.scores.map((s) => (
              <ScoreBar key={s.label} label={s.label} value={s.value} note={s.note} />
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-2 text-[11px] uppercase tracking-[0.12em] text-ink3">What went well</h3>
            <ul className="space-y-1.5">
              {report.strengths.map((s) => (
                <li key={s} className="flex gap-2 text-[13px] text-ink1">
                  <span className="text-lime">▸</span> {s}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-[11px] uppercase tracking-[0.12em] text-ink3">Recommendations</h3>
            <ul className="space-y-1.5">
              {report.recommendations.map((s) => (
                <li key={s} className="flex gap-2 text-[13px] text-ink1">
                  <span className="text-amber">▸</span> {s}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Replay timeline */}
      <section className="mt-6">
        <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-ink2">
          Interview replay
        </h2>
        <Card className="p-4">
          <div className="space-y-0">
            {milestones.map((t, i) => (
              <button
                key={t.id}
                onClick={() => onReplay(t)}
                className="flex w-full gap-3 text-left"
              >
                <div className="flex shrink-0 flex-col items-center">
                  <span
                    className={cn(
                      "mt-1 h-2.5 w-2.5 rounded-full border-2 transition-colors",
                      replayId === t.id ? "border-lime bg-lime" : "border-ink3 bg-bg1",
                    )}
                  />
                  {i < milestones.length - 1 && <span className="w-px flex-1 bg-line" />}
                </div>
                <div className={cn("pb-4", replayId === t.id && "text-ink0")}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] text-lime">{fmtTime(t.t)}</span>
                    <span className="text-[13px] text-ink0">{STAGE_LABEL[t.stage]}</span>
                    <Play className="h-3 w-3 text-ink3" />
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink2">
                    {speakableText(t.text).slice(0, 160)}
                    {t.text.length > 160 ? "…" : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-ink3">Click any moment to hear it again.</p>
        </Card>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-ink2">
          Session signals
        </h2>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Signal label="Talk ratio" value={`${Math.round((metrics.spokenSeconds / Math.max(1, elapsed)) * 100)}%`} />
          <Signal label="Responses" value={metrics.candidateTurns} />
          <Signal label="First code at" value={metrics.timeToFirstCode === null ? "—" : fmtTime(metrics.timeToFirstCode)} />
          <Signal label="Tests" value={metrics.testsTotal ? `${metrics.testsPassed}/${metrics.testsTotal}` : "—"} />
          <Signal label="Longest silence" value={`${Math.round(metrics.longestSilence)}s`} />
          <Signal label="Complexity raised" value={metrics.mentionedComplexity ? "yes" : "no"} />
        </div>
      </section>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-line bg-bg1 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.12em] text-ink3">{label}</div>
      <div className="mt-0.5 font-mono text-[15px] text-ink0">{value}</div>
    </div>
  );
}
