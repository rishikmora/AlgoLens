"use client";

import { createClient, supabaseConfigured } from "./supabase/client";
import type {
  AiChatMessageRow, AiChatRow, InterviewMessageRow, InterviewSessionRow,
  Json, ProgressRow, SavedVizRow, SubmissionRow,
} from "./supabase/types";
import type { Turn, InterviewReport, SessionMetrics } from "./ai/interview";

/**
 * Data access for everything user-scoped.
 *
 * Every call goes through the browser client, so RLS applies — a request
 * for someone else's rows returns an empty set rather than an error, which
 * is exactly what we want.
 *
 * All functions no-op (or return empty) when Supabase isn't configured, so
 * the app keeps working signed out on localStorage alone.
 */

const sb = () => (supabaseConfigured() ? createClient() : null);

/* ── Progress ─────────────────────────────────────────────────────── */

export async function fetchProgress(userId: string): Promise<ProgressRow | null> {
  const c = sb();
  if (!c) return null;
  const { data } = await c.from("progress").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

/* ── Submissions ──────────────────────────────────────────────────── */

export interface SubmitArgs {
  problemSlug: string;
  language: string;
  code: string;
  status: string;
  passed: number;
  total: number;
  runtimeMs?: number;
  memoryKb?: number;
  durationSec?: number;
}

/**
 * Records an attempt through the `record_submission` RPC so the insert and
 * the progress update happen in one transaction, with XP derived server-side.
 */
export async function recordSubmission(args: SubmitArgs): Promise<ProgressRow | null> {
  const c = sb();
  if (!c) return null;
  const { data, error } = await c.rpc("record_submission", {
    p_problem_slug: args.problemSlug,
    p_language: args.language,
    p_code: args.code,
    p_status: args.status,
    p_passed: args.passed,
    p_total: args.total,
    p_runtime_ms: args.runtimeMs,
    p_memory_kb: args.memoryKb,
    p_duration_sec: args.durationSec,
  });
  if (error) {
    console.error("[db] record_submission failed:", error.message);
    return null;
  }
  return data as unknown as ProgressRow;
}

export async function listSubmissions(limit = 100): Promise<SubmissionRow[]> {
  const c = sb();
  if (!c) return [];
  const { data } = await c
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listSubmissionsForProblem(slug: string): Promise<SubmissionRow[]> {
  const c = sb();
  if (!c) return [];
  const { data } = await c
    .from("submissions")
    .select("*")
    .eq("problem_slug", slug)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Slugs the user has ever had accepted — the source of truth for "solved". */
export async function listSolvedSlugs(): Promise<string[]> {
  const c = sb();
  if (!c) return [];
  const { data } = await c.from("submissions").select("problem_slug").eq("status", "Accepted");
  return [...new Set((data ?? []).map((r) => r.problem_slug))];
}

/* ── Saved code / drafts ──────────────────────────────────────────── */

export async function saveCode(userId: string, slug: string, language: string, code: string) {
  const c = sb();
  if (!c) return;
  await c.from("saved_code").upsert(
    { user_id: userId, problem_slug: slug, language, code },
    { onConflict: "user_id,problem_slug,language" },
  );
}

export async function fetchSavedCode(slug: string, language: string): Promise<string | null> {
  const c = sb();
  if (!c) return null;
  const { data } = await c
    .from("saved_code")
    .select("code")
    .eq("problem_slug", slug)
    .eq("language", language)
    .maybeSingle();
  return data?.code ?? null;
}

/* ── Interviews ───────────────────────────────────────────────────── */

export async function saveInterview(args: {
  userId: string;
  packId: string;
  company: string;
  mode: string;
  problemSlug?: string;
  difficulty?: string;
  report: InterviewReport;
  metrics: SessionMetrics;
  durationSec: number;
  turns: Turn[];
}): Promise<string | null> {
  const c = sb();
  if (!c) return null;

  const { data, error } = await c
    .from("interview_sessions")
    .insert({
      user_id: args.userId,
      pack_id: args.packId,
      company: args.company,
      mode: args.mode,
      problem_slug: args.problemSlug ?? null,
      difficulty: args.difficulty ?? null,
      overall_score: args.report.overall,
      verdict: args.report.verdict,
      scores: args.report.scores as unknown as Json,
      strengths: args.report.strengths,
      recommendations: args.report.recommendations,
      metrics: args.metrics as unknown as Json,
      duration_sec: args.durationSec,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[db] saveInterview failed:", error?.message);
    return null;
  }

  if (args.turns.length) {
    const { error: msgError } = await c.from("interview_messages").insert(
      args.turns.map((t) => ({
        session_id: data.id,
        speaker: t.role,
        message: t.text,
        t_seconds: Math.round(t.t),
        stage: t.stage,
      })),
    );
    if (msgError) console.error("[db] interview transcript failed:", msgError.message);
  }

  return data.id;
}

export async function listInterviews(limit = 50): Promise<InterviewSessionRow[]> {
  const c = sb();
  if (!c) return [];
  const { data } = await c
    .from("interview_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function fetchInterview(id: string): Promise<{
  session: InterviewSessionRow;
  messages: InterviewMessageRow[];
} | null> {
  const c = sb();
  if (!c) return null;
  const { data: session } = await c
    .from("interview_sessions").select("*").eq("id", id).maybeSingle();
  if (!session) return null;
  const { data: messages } = await c
    .from("interview_messages").select("*").eq("session_id", id).order("t_seconds");
  return { session, messages: messages ?? [] };
}

/* ── AI chat history ──────────────────────────────────────────────── */

export async function createChat(userId: string, title: string, problemSlug?: string) {
  const c = sb();
  if (!c) return null;
  const { data, error } = await c
    .from("ai_chats")
    .insert({ user_id: userId, title: title.slice(0, 80), problem_slug: problemSlug ?? null })
    .select("id")
    .single();
  if (error) {
    console.error("[db] createChat failed:", error.message);
    return null;
  }
  return data.id;
}

export async function appendChatMessage(args: {
  chatId: string;
  role: "user" | "tutor";
  content: string;
  source?: string;
  hintLevel?: number;
  /** Passing the title re-writes it, which also bumps updated_at via trigger
   *  so the chat floats to the top of history. */
  bumpTitle?: string;
}) {
  const c = sb();
  if (!c) return;
  await c.from("ai_chat_messages").insert({
    chat_id: args.chatId,
    role: args.role,
    content: args.content,
    source: args.source ?? null,
    hint_level: args.hintLevel ?? null,
  });
  if (args.bumpTitle !== undefined) {
    await c.from("ai_chats").update({ title: args.bumpTitle.slice(0, 80) }).eq("id", args.chatId);
  }
}

export async function listChats(limit = 50): Promise<AiChatRow[]> {
  const c = sb();
  if (!c) return [];
  const { data } = await c
    .from("ai_chats").select("*").order("updated_at", { ascending: false }).limit(limit);
  return data ?? [];
}

export async function fetchChat(id: string): Promise<{
  chat: AiChatRow;
  messages: AiChatMessageRow[];
} | null> {
  const c = sb();
  if (!c) return null;
  const { data: chat } = await c.from("ai_chats").select("*").eq("id", id).maybeSingle();
  if (!chat) return null;
  const { data: messages } = await c
    .from("ai_chat_messages").select("*").eq("chat_id", id).order("created_at");
  return { chat, messages: messages ?? [] };
}

export async function deleteChat(id: string) {
  const c = sb();
  if (!c) return;
  await c.from("ai_chats").delete().eq("id", id);
}

/* ── Saved visualizations ─────────────────────────────────────────── */

export async function saveVisualization(args: {
  userId: string;
  algorithmId: string;
  algorithmName: string;
  input: number[];
  stepCount: number;
  note?: string;
}) {
  const c = sb();
  if (!c) return null;
  const { data, error } = await c
    .from("saved_visualizations")
    .insert({
      user_id: args.userId,
      algorithm_id: args.algorithmId,
      algorithm_name: args.algorithmName,
      input: args.input as unknown as Json,
      step_count: args.stepCount,
      note: args.note ?? null,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[db] saveVisualization failed:", error.message);
    return null;
  }
  return data.id;
}

export async function listVisualizations(limit = 50): Promise<SavedVizRow[]> {
  const c = sb();
  if (!c) return [];
  const { data } = await c
    .from("saved_visualizations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function deleteVisualization(id: string) {
  const c = sb();
  if (!c) return;
  await c.from("saved_visualizations").delete().eq("id", id);
}

/* ── Recently viewed / bookmarks / notes ──────────────────────────── */

export async function touchRecentView(userId: string, slug: string) {
  const c = sb();
  if (!c) return;
  await c.from("recent_views").upsert(
    { user_id: userId, problem_slug: slug, viewed_at: new Date().toISOString() },
    { onConflict: "user_id,problem_slug" },
  );
}

export async function listRecentViews(limit = 8) {
  const c = sb();
  if (!c) return [];
  const { data } = await c
    .from("recent_views")
    .select("problem_slug, viewed_at")
    .order("viewed_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function toggleBookmark(userId: string, slug: string, on: boolean) {
  const c = sb();
  if (!c) return;
  if (on) await c.from("bookmarks").upsert({ user_id: userId, problem_slug: slug });
  else await c.from("bookmarks").delete().eq("user_id", userId).eq("problem_slug", slug);
}

export async function listBookmarks(): Promise<string[]> {
  const c = sb();
  if (!c) return [];
  const { data } = await c.from("bookmarks").select("problem_slug");
  return (data ?? []).map((r) => r.problem_slug);
}

export async function saveNote(userId: string, slug: string, note: string) {
  const c = sb();
  if (!c) return;
  await c.from("problem_notes").upsert(
    { user_id: userId, problem_slug: slug, note },
    { onConflict: "user_id,problem_slug" },
  );
}

export async function fetchNote(slug: string): Promise<string> {
  const c = sb();
  if (!c) return "";
  const { data } = await c
    .from("problem_notes").select("note").eq("problem_slug", slug).maybeSingle();
  return data?.note ?? "";
}

/* ── Hints, badges, resumes ───────────────────────────────────────── */

export async function recordHint(userId: string, slug: string, level: number) {
  const c = sb();
  if (!c) return;
  await c.from("hints_used").insert({ user_id: userId, problem_slug: slug, level });
}

export async function earnBadge(userId: string, badgeId: string) {
  const c = sb();
  if (!c) return;
  await c.from("badges").upsert(
    { user_id: userId, badge_id: badgeId },
    { onConflict: "user_id,badge_id", ignoreDuplicates: true },
  );
}

export async function listBadges(): Promise<string[]> {
  const c = sb();
  if (!c) return [];
  const { data } = await c.from("badges").select("badge_id");
  return (data ?? []).map((r) => r.badge_id);
}

export async function saveResume(args: {
  userId: string;
  content: string;
  filename?: string;
  projects: string[];
}) {
  const c = sb();
  if (!c) return;
  // Previous versions stay for history; only one is active.
  await c.from("resumes").update({ is_active: false }).eq("user_id", args.userId);
  const { count } = await c
    .from("resumes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", args.userId);
  await c.from("resumes").insert({
    user_id: args.userId,
    content: args.content,
    filename: args.filename ?? null,
    projects: args.projects,
    version: (count ?? 0) + 1,
    is_active: true,
  });
}
