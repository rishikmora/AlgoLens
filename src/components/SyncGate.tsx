"use client";

import { useEffect } from "react";
import { PROBLEMS } from "@/data/problems";
import { useAuth } from "@/lib/auth";
import { useProgress } from "@/lib/store";
import {
  fetchProgress, listInterviews, listSolvedSlugs, listSubmissions,
} from "@/lib/db";
import type { Difficulty } from "@/data/problems";
import type { InterviewReport } from "@/lib/ai/interview";

/**
 * Bridges Supabase and the local store.
 *
 * Signed out, the app runs entirely on the persisted zustand store. Once a
 * user resolves, remote state replaces the local cache — the database is
 * authoritative, so a stale browser can never inflate someone's XP.
 *
 * Renders nothing.
 */
export default function SyncGate() {
  const { user, profile } = useAuth();
  const setUserId = useProgress((s) => s.setUserId);
  const hydrateRemote = useProgress((s) => s.hydrateRemote);
  const userId = useProgress((s) => s.userId);
  const hydrated = useProgress((s) => s.hydrated);

  useEffect(() => {
    setUserId(user?.id ?? null);
  }, [user?.id, setUserId]);

  useEffect(() => {
    if (!userId || hydrated) return;
    let cancelled = false;

    (async () => {
      const [progress, solvedSlugs, submissions, interviews] = await Promise.all([
        fetchProgress(userId),
        listSolvedSlugs(),
        listSubmissions(100),
        listInterviews(50),
      ]);
      if (cancelled) return;

      const difficultyBySlug = new Map(PROBLEMS.map((p) => [p.slug, p.difficulty]));
      const solved: Record<string, Difficulty> = {};
      for (const slug of solvedSlugs) {
        const d = difficultyBySlug.get(slug);
        if (d) solved[slug] = d;
      }

      hydrateRemote({
        solved,
        attempted: [...new Set(submissions.map((s) => s.problem_slug))],
        submissions: submissions.map((s) => ({
          slug: s.problem_slug,
          title: PROBLEMS.find((p) => p.slug === s.problem_slug)?.title ?? s.problem_slug,
          difficulty: difficultyBySlug.get(s.problem_slug) ?? "Easy",
          lang: s.language as never,
          verdict: s.status,
          passed: s.passed,
          total: s.total,
          runtimeMs: Number(s.runtime_ms ?? 0),
          at: new Date(s.created_at).getTime(),
        })),
        interviews: interviews.map((r) => ({
          id: r.id,
          packId: r.pack_id,
          packName: r.company,
          mode: r.mode,
          problemSlug: r.problem_slug ?? undefined,
          report: {
            overall: r.overall_score,
            verdict: r.verdict ?? "",
            scores: (r.scores as unknown as InterviewReport["scores"]) ?? [],
            strengths: r.strengths ?? [],
            recommendations: r.recommendations ?? [],
          },
          durationSec: r.duration_sec,
          at: new Date(r.created_at).getTime(),
        })),
        ...(progress
          ? { xp: progress.xp, coins: progress.coins, streak: progress.streak }
          : {}),
        ...(profile?.name ? { name: profile.name } : {}),
      });
    })();

    return () => { cancelled = true; };
  }, [userId, hydrated, profile?.name, hydrateRemote]);

  return null;
}
