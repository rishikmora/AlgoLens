import type { Stage, InterviewMode, SessionMetrics } from "./interview";

export interface AIResponse {
  text: string;
  source: "claude" | "local";
}

async function post(body: unknown): Promise<AIResponse> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return { text: "The AI service is unavailable right now. Try again in a moment.", source: "local" };
  }
  return res.json();
}

export function askTutor(args: {
  question: string;
  problemSlug?: string;
  code?: string;
  hintLevel?: number;
}) {
  return post({ mode: "tutor", ...args });
}

export function askInterviewer(args: {
  stage: Stage;
  interviewMode: InterviewMode;
  packId: string;
  problemSlug?: string;
  candidateName?: string;
  questionIndex?: number;
  resumeProjects?: string[];
  metrics?: SessionMetrics;
  lastCandidateTurn?: string;
  code?: string;
}) {
  return post({ mode: "interview", ...args });
}

export async function aiStatus(): Promise<{ configured: boolean; model: string | null; note: string }> {
  try {
    const res = await fetch("/api/ai");
    return res.json();
  } catch {
    return { configured: false, model: null, note: "Could not reach /api/ai." };
  }
}
