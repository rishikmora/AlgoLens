import { BEHAVIORAL_QUESTIONS, DSA_FOLLOWUPS, RESUME_QUESTIONS, packById } from "@/data/companies";
import type { Problem } from "@/data/problems";

export type Stage =
  | "welcome" | "intro" | "problem" | "coding"
  | "optimize" | "followup" | "behavioral" | "wrapup" | "done";

export const STAGE_LABEL: Record<Stage, string> = {
  welcome: "Welcome",
  intro: "Introduction",
  problem: "Problem statement",
  coding: "Coding",
  optimize: "Optimization",
  followup: "Follow-up",
  behavioral: "Behavioral",
  wrapup: "Wrap-up",
  done: "Complete",
};

export const STAGE_ORDER: Stage[] = [
  "welcome", "intro", "problem", "coding", "optimize", "followup", "behavioral", "wrapup", "done",
];

export type InterviewMode = "dsa" | "behavioral" | "resume";

export interface Turn {
  id: string;
  role: "interviewer" | "candidate";
  text: string;
  /** Seconds since the interview started — powers the replay timeline. */
  t: number;
  stage: Stage;
}

export interface SessionMetrics {
  /** Seconds the candidate spent speaking vs. total elapsed. */
  spokenSeconds: number;
  elapsed: number;
  candidateTurns: number;
  /** Seconds from problem statement to first keystroke. */
  timeToFirstCode: number | null;
  codeLength: number;
  testsPassed: number;
  testsTotal: number;
  mentionedComplexity: boolean;
  mentionedEdgeCases: boolean;
  longestSilence: number;
  hintsUsed: number;
  /** Total words spoken, so filler density is meaningful rather than a raw count. */
  wordCount: number;
  fillerCount: number;
  /** Which STAR components the candidate's answers actually covered. */
  star: { situation: boolean; task: boolean; action: boolean; result: boolean };
}

export const emptyMetrics = (): SessionMetrics => ({
  spokenSeconds: 0,
  elapsed: 0,
  candidateTurns: 0,
  timeToFirstCode: null,
  codeLength: 0,
  testsPassed: 0,
  testsTotal: 0,
  mentionedComplexity: false,
  mentionedEdgeCases: false,
  longestSilence: 0,
  hintsUsed: 0,
  wordCount: 0,
  fillerCount: 0,
  star: { situation: false, task: false, action: false, result: false },
});

const COMPLEXITY_RE = /\b(o\s*\(|big.?o|complexity|linear|logarithmic|quadratic|constant time|n log n|amortized)\b/i;
const EDGE_RE = /\b(edge case|empty|null|overflow|boundary|duplicate|negative|single element|off.by.one)\b/i;

/** Verbal fillers. Multi-word phrases are matched before single words. */
const FILLERS = [
  /\byou know\b/gi, /\bi mean\b/gi, /\bkind of\b/gi, /\bsort of\b/gi,
  /\bor something\b/gi, /\bi guess\b/gi,
  /\bum+\b/gi, /\buh+\b/gi, /\berm+\b/gi, /\bhmm+\b/gi,
  /\blike\b/gi, /\bbasically\b/gi, /\bactually\b/gi, /\bliterally\b/gi,
  /\bobviously\b/gi, /\bjust\b/gi, /\bright\?/gi,
];

export function countFillers(text: string): number {
  return FILLERS.reduce((n, re) => n + (text.match(re)?.length ?? 0), 0);
}

/* STAR detection — looks for the language people actually use for each part. */
const STAR_RE = {
  situation: /\b(at my|when i was|during|we were|the project|last (year|semester|internship)|context was)\b/i,
  task: /\b(my (job|task|role|responsibility)|i had to|i was asked|the goal was|i needed to|we needed to)\b/i,
  action: /\b(i (built|wrote|designed|implemented|refactored|led|proposed|debugged|migrated|decided)|so i|i then)\b/i,
  result: /\b(as a result|which (reduced|improved|increased|cut)|we shipped|ended up|the outcome|by \d+ ?%|\d+ ?% (faster|fewer|more|less))\b/i,
};

export function scanCandidateSpeech(text: string, m: SessionMetrics): SessionMetrics {
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    ...m,
    candidateTurns: m.candidateTurns + 1,
    // ~2.5 words per second is a normal speaking pace.
    spokenSeconds: m.spokenSeconds + words / 2.5,
    wordCount: m.wordCount + words,
    fillerCount: m.fillerCount + countFillers(text),
    mentionedComplexity: m.mentionedComplexity || COMPLEXITY_RE.test(text),
    mentionedEdgeCases: m.mentionedEdgeCases || EDGE_RE.test(text),
    star: {
      situation: m.star.situation || STAR_RE.situation.test(text),
      task: m.star.task || STAR_RE.task.test(text),
      action: m.star.action || STAR_RE.action.test(text),
      result: m.star.result || STAR_RE.result.test(text),
    },
  };
}

/** The interviewer's opening line for each stage. */
export function interviewerLine(
  stage: Stage,
  opts: {
    packId: string;
    mode: InterviewMode;
    problem?: Problem;
    candidateName?: string;
    questionIndex?: number;
    resumeProjects?: string[];
    metrics?: SessionMetrics;
  },
): string {
  const pack = packById(opts.packId);
  const name = opts.candidateName?.trim() || "there";
  const qi = opts.questionIndex ?? 0;

  switch (stage) {
    case "welcome":
      return (
        `Hi ${name}, thanks for making the time. I'm your interviewer for today's ${pack?.name ?? "technical"} loop.\n\n` +
        `Here's the plan: a quick introduction, then one coding problem where I'd like you to think out loud, ` +
        `then some follow-ups and a couple of behavioral questions. Roughly 45 minutes.\n\n` +
        `Talk me through your reasoning as you go — I care more about how you think than whether you land the optimal solution immediately. Ready?`
      );

    case "intro":
      return opts.mode === "resume"
        ? `Great. Before we code — walk me through your background, and pick one project you'd be happy to go deep on.`
        : `Great. Let's start with you — tell me about yourself and what you've been working on recently.`;

    case "problem": {
      if (opts.mode === "behavioral") return BEHAVIORAL_QUESTIONS[qi % BEHAVIORAL_QUESTIONS.length];
      if (opts.mode === "resume") {
        const project = opts.resumeProjects?.[qi % Math.max(1, opts.resumeProjects.length)] ?? "your main project";
        return RESUME_QUESTIONS[qi % RESUME_QUESTIONS.length]
          .replace("{project}", project)
          .replace("{tech}", "that stack");
      }
      const p = opts.problem;
      if (!p) return "Let's look at a problem.";
      return (
        `Let's get into the coding portion. The problem is **${p.title}**.\n\n` +
        `${p.description.replace(/\*\*/g, "")}\n\n` +
        `For example: ${p.examples[0].input} should return ${p.examples[0].output}.\n\n` +
        `Take a minute to read it. Before you write any code, tell me your approach and the complexity you expect.`
      );
    }

    case "coding":
      return `Go ahead and start coding when you're ready. Keep narrating — if you go quiet I'll assume you're stuck and jump in.`;

    case "optimize": {
      const p = opts.problem;
      const solved = (opts.metrics?.testsTotal ?? 0) > 0 && opts.metrics!.testsPassed === opts.metrics!.testsTotal;
      if (!solved) {
        return `Let's pause the implementation there. Talk me through what your solution does right now, and what its time complexity is.`;
      }
      return (
        `Good — that passes. Now: what's the time and space complexity of what you just wrote?\n\n` +
        (p ? `And can you do better than ${p.editorial.time}, or argue that you can't?` : `Can you do better?`)
      );
    }

    case "followup": {
      if (opts.mode === "behavioral") {
        return BEHAVIORAL_QUESTIONS[(qi + 1) % BEHAVIORAL_QUESTIONS.length];
      }
      const pool = pack?.focus.length ? DSA_FOLLOWUPS : DSA_FOLLOWUPS;
      return pool[qi % pool.length];
    }

    case "behavioral":
      return (
        (pack?.id === "amazon"
          ? `Switching gears to the Leadership Principles. `
          : `Let's switch to the behavioral portion. `) +
        BEHAVIORAL_QUESTIONS[(qi + 2) % BEHAVIORAL_QUESTIONS.length] +
        `\n\nUse the STAR structure if you can: Situation, Task, Action, Result.`
      );

    case "wrapup":
      return (
        `That's all my questions. Before we close — is there anything you'd like to ask me about the team or the role?\n\n` +
        `I'll put together your feedback now.`
      );

    case "done":
      return `Thanks ${name}. Your report is ready below.`;
  }
}

/** Real-time coaching, triggered by what the candidate is (not) doing. */
export function liveNudge(m: SessionMetrics, silenceSec: number, stage: Stage): string | null {
  if (stage !== "coding" && stage !== "problem") return null;

  if (silenceSec > 45) return "You've been quiet for a while — talk me through what you're considering.";
  if (silenceSec > 25) return "What are you thinking right now?";
  if (stage === "coding" && m.codeLength > 120 && !m.mentionedComplexity) {
    return "Before you go further — what complexity are you aiming for?";
  }
  if (stage === "coding" && m.codeLength > 250 && !m.mentionedEdgeCases) {
    return "What edge cases does this need to handle?";
  }
  if (stage === "problem" && m.codeLength > 40 && m.candidateTurns === 0) {
    return "You started coding before describing your approach — walk me through the plan first.";
  }
  return null;
}

// ─── Report ──────────────────────────────────────────────────────────

export interface ReportScore {
  label: string;
  value: number;
  note: string;
}

export interface InterviewReport {
  overall: number;
  scores: ReportScore[];
  strengths: string[];
  recommendations: string[];
  verdict: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Scores are computed from what actually happened in the session —
 * talk ratio, time to first code, tests passed, whether complexity and
 * edge cases were raised unprompted.
 */
export function buildReport(m: SessionMetrics, mode: InterviewMode): InterviewReport {
  const talkRatio = m.elapsed > 0 ? Math.min(1, m.spokenSeconds / m.elapsed) : 0;
  const solveRatio = m.testsTotal > 0 ? m.testsPassed / m.testsTotal : 0;

  // Communication: healthy talk ratio is roughly 25–55% of the session.
  const talkScore = talkRatio < 0.1 ? 30 : talkRatio < 0.25 ? 62 : talkRatio <= 0.55 ? 92 : 78;
  const communication = clamp(
    talkScore * 0.6 +
    (m.candidateTurns >= 5 ? 100 : m.candidateTurns * 20) * 0.25 +
    (m.longestSilence < 30 ? 100 : m.longestSilence < 60 ? 65 : 35) * 0.15,
  );

  const coding = mode === "dsa"
    ? clamp(solveRatio * 82 + (m.codeLength > 60 ? 18 : m.codeLength / 60 * 18))
    : clamp(70 + m.candidateTurns * 3);

  const problemSolving = clamp(
    (m.timeToFirstCode === null ? 60 : m.timeToFirstCode > 60 ? 92 : m.timeToFirstCode > 20 ? 80 : 55) * 0.5 +
    solveRatio * 100 * 0.3 +
    (100 - m.hintsUsed * 18) * 0.2,
  );

  const optimization = clamp(
    (m.mentionedComplexity ? 92 : 45) * 0.7 + solveRatio * 100 * 0.3,
  );

  // Filler density: under ~2% of words is clean speech, over ~8% is distracting.
  const fillerPct = m.wordCount > 0 ? (m.fillerCount / m.wordCount) * 100 : 0;
  const fluencyPenalty = m.wordCount < 25 ? 0 : Math.min(30, Math.max(0, (fillerPct - 2) * 3.2));

  const confidence = clamp(
    talkScore * 0.5 +
    (m.longestSilence < 25 ? 95 : 60) * 0.3 +
    (m.candidateTurns >= 4 ? 90 : 60) * 0.2 -
    fluencyPenalty,
  );

  const starHits = Object.values(m.star).filter(Boolean).length;

  const scores: ReportScore[] = [
    { label: "Coding", value: coding, note: m.testsTotal ? `${m.testsPassed}/${m.testsTotal} tests passed` : "Not a coding round" },
    { label: "Communication", value: communication, note: `Spoke for ~${Math.round(talkRatio * 100)}% of the session` },
    { label: "Problem Solving", value: problemSolving, note: m.hintsUsed ? `${m.hintsUsed} hint(s) used` : "No hints used" },
    { label: "Optimization", value: optimization, note: m.mentionedComplexity ? "Raised complexity unprompted" : "Complexity never discussed" },
    {
      label: "Fluency",
      value: clamp(100 - fluencyPenalty * 3.3),
      note: m.wordCount < 25
        ? "Too few words to judge"
        : `${m.fillerCount} filler word${m.fillerCount === 1 ? "" : "s"} in ${m.wordCount} (${fillerPct.toFixed(1)}%)`,
    },
    { label: "Confidence", value: confidence, note: `Longest silence ${Math.round(m.longestSilence)}s` },
  ];

  if (mode === "behavioral" || mode === "resume") {
    scores.push({
      label: "STAR Structure",
      value: clamp((starHits / 4) * 100),
      note: starHits === 4
        ? "Situation, Task, Action and Result all covered"
        : `Missing: ${Object.entries(m.star).filter(([, v]) => !v).map(([k]) => k).join(", ")}`,
    });
  }

  const overall = clamp(
    coding * 0.28 + communication * 0.24 + problemSolving * 0.22 +
    optimization * 0.1 + confidence * 0.1 - fluencyPenalty * 0.2 +
    (mode === "dsa" ? 0 : (starHits / 4) * 6),
  );

  const strengths: string[] = [];
  const recommendations: string[] = [];

  if (solveRatio === 1) strengths.push("Reached a fully working solution.");
  if (m.mentionedComplexity) strengths.push("Discussed complexity without being asked.");
  else recommendations.push("State the time and space complexity out loud — before the interviewer asks.");
  if (m.mentionedEdgeCases) strengths.push("Raised edge cases proactively.");
  else recommendations.push("Name at least two edge cases before you declare yourself done.");
  if (talkRatio >= 0.25 && talkRatio <= 0.55) strengths.push("Good balance between thinking and narrating.");
  else if (talkRatio < 0.25) recommendations.push("Talk more while coding — silence reads as being stuck.");
  else recommendations.push("You narrated almost continuously; leave pauses for the interviewer to steer.");
  if (m.timeToFirstCode !== null && m.timeToFirstCode < 20) {
    recommendations.push("You started coding within 20 seconds. Spend a minute on the approach first.");
  }
  if (m.hintsUsed > 1) recommendations.push("Practice the pattern behind this problem so you need fewer hints.");
  if (m.longestSilence > 45) recommendations.push("Break long silences with 'let me think about X for a second'.");

  if (fillerPct > 6 && m.wordCount >= 25) {
    recommendations.push(
      `Filler words were ${fillerPct.toFixed(0)}% of what you said. Replace "um" and "like" with a short pause — silence reads as composure.`,
    );
  } else if (m.wordCount >= 40 && fillerPct < 2) {
    strengths.push("Clean delivery with almost no filler words.");
  }

  if (mode !== "dsa") {
    if (starHits === 4) strengths.push("Answers followed the full STAR structure.");
    else {
      const missing = Object.entries(m.star).filter(([, v]) => !v).map(([k]) => k);
      recommendations.push(
        `Your answers skipped the ${missing.join(" and ")} part of STAR — the Result is what interviewers actually score.`,
      );
    }
  }

  if (strengths.length === 0) strengths.push("Completed the session end to end.");

  const verdict =
    overall >= 85 ? "Strong hire signal"
    : overall >= 70 ? "Hire — with minor reservations"
    : overall >= 55 ? "Borderline — more practice needed"
    : "Not yet ready for this bar";

  return { overall, scores, strengths, recommendations, verdict };
}

/** Adaptive difficulty: fast, clean solve → harder next; struggle → easier. */
export function nextDifficulty(
  current: "Easy" | "Medium" | "Hard",
  m: SessionMetrics,
): "Easy" | "Medium" | "Hard" {
  const solved = m.testsTotal > 0 && m.testsPassed === m.testsTotal;
  const fast = m.elapsed < 15 * 60;
  const order: ("Easy" | "Medium" | "Hard")[] = ["Easy", "Medium", "Hard"];
  const i = order.indexOf(current);
  if (solved && fast && m.hintsUsed === 0) return order[Math.min(2, i + 1)];
  if (!solved || m.hintsUsed >= 2) return order[Math.max(0, i - 1)];
  return current;
}
