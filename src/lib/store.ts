"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Difficulty, Lang } from "@/data/problems";
import type { InterviewReport } from "@/lib/ai/interview";

export interface Submission {
  slug: string;
  title: string;
  difficulty: Difficulty;
  lang: Lang;
  verdict: string;
  passed: number;
  total: number;
  runtimeMs: number;
  at: number;
}

export interface InterviewRecord {
  id: string;
  packId: string;
  packName: string;
  mode: string;
  problemSlug?: string;
  report: InterviewReport;
  durationSec: number;
  at: number;
}

interface ProgressState {
  name: string;
  solved: Record<string, Difficulty>;
  attempted: string[];
  submissions: Submission[];
  interviews: InterviewRecord[];
  xp: number;
  coins: number;
  streak: number;
  lastActiveDay: string | null;
  drafts: Record<string, string>;

  setName: (n: string) => void;
  recordSubmission: (s: Submission) => void;
  saveDraft: (key: string, code: string) => void;
  recordInterview: (r: InterviewRecord) => void;
  touchStreak: () => void;
  reset: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const XP_FOR: Record<Difficulty, number> = { Easy: 25, Medium: 60, Hard: 120 };

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      name: "Rishik",
      solved: {},
      attempted: [],
      submissions: [],
      interviews: [],
      xp: 0,
      coins: 0,
      streak: 0,
      lastActiveDay: null,
      drafts: {},

      setName: (name) => set({ name }),

      recordSubmission: (s) =>
        set((st) => {
          const wasSolved = Boolean(st.solved[s.slug]);
          const nowSolved = s.verdict === "Accepted";
          const gained = nowSolved && !wasSolved ? XP_FOR[s.difficulty] : nowSolved ? 5 : 0;
          return {
            submissions: [s, ...st.submissions].slice(0, 100),
            attempted: st.attempted.includes(s.slug) ? st.attempted : [...st.attempted, s.slug],
            solved: nowSolved ? { ...st.solved, [s.slug]: s.difficulty } : st.solved,
            xp: st.xp + gained,
            coins: st.coins + (gained > 0 ? Math.round(gained / 5) : 0),
          };
        }),

      saveDraft: (key, code) => set((st) => ({ drafts: { ...st.drafts, [key]: code } })),

      recordInterview: (r) =>
        set((st) => ({
          interviews: [r, ...st.interviews].slice(0, 50),
          xp: st.xp + Math.round(r.report.overall / 2),
          coins: st.coins + 10,
        })),

      touchStreak: () => {
        const t = today();
        const last = get().lastActiveDay;
        if (last === t) return;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        set((st) => ({
          lastActiveDay: t,
          streak: last === yesterday ? st.streak + 1 : 1,
        }));
      },

      reset: () =>
        set({
          solved: {}, attempted: [], submissions: [], interviews: [],
          xp: 0, coins: 0, streak: 0, lastActiveDay: null, drafts: {},
        }),
    }),
    { name: "rishalgo-progress" },
  ),
);

export const LEVELS = [
  { level: 1, name: "Initiate", xp: 0 },
  { level: 2, name: "Apprentice", xp: 150 },
  { level: 3, name: "Practitioner", xp: 400 },
  { level: 4, name: "Analyst", xp: 800 },
  { level: 5, name: "Engineer", xp: 1500 },
  { level: 6, name: "Architect", xp: 2600 },
  { level: 7, name: "Principal", xp: 4200 },
];

export function levelFor(xp: number) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xp) cur = l;
  const next = LEVELS.find((l) => l.xp > xp);
  const span = next ? next.xp - cur.xp : 1;
  const into = xp - cur.xp;
  return { ...cur, next, progress: next ? Math.min(100, (into / span) * 100) : 100 };
}

export const BADGES = [
  { id: "first-blood", name: "First Blood", desc: "Solve your first problem", icon: "🩸" },
  { id: "streak-7", name: "Week Warrior", desc: "7-day streak", icon: "🔥" },
  { id: "ten-solved", name: "Double Digits", desc: "Solve 10 problems", icon: "🎯" },
  { id: "interviewer", name: "Under Pressure", desc: "Complete a mock interview", icon: "🎙️" },
  { id: "hard-mode", name: "Hard Mode", desc: "Solve a Hard problem", icon: "💎" },
  { id: "no-hints", name: "Unassisted", desc: "Interview with zero hints", icon: "🧠" },
];

export function earnedBadges(st: {
  solved: Record<string, Difficulty>;
  streak: number;
  interviews: InterviewRecord[];
}) {
  const solvedCount = Object.keys(st.solved).length;
  return new Set(
    [
      solvedCount >= 1 && "first-blood",
      st.streak >= 7 && "streak-7",
      solvedCount >= 10 && "ten-solved",
      st.interviews.length >= 1 && "interviewer",
      Object.values(st.solved).includes("Hard") && "hard-mode",
      st.interviews.some((i) => i.report.scores.find((s) => s.label === "Problem Solving" && s.value >= 90)) && "no-hints",
    ].filter(Boolean) as string[],
  );
}
