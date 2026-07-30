import { NextResponse } from "next/server";
import { localTutor } from "@/lib/ai/tutor";
import { interviewerLine, type Stage, type InterviewMode, type SessionMetrics } from "@/lib/ai/interview";
import { problemBySlug } from "@/data/problems";
import { packById } from "@/data/companies";

export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const hasKey = () => Boolean(process.env.ANTHROPIC_API_KEY);

interface TutorBody {
  mode: "tutor";
  question: string;
  problemSlug?: string;
  code?: string;
  hintLevel?: number;
}

interface InterviewBody {
  mode: "interview";
  stage: Stage;
  interviewMode: InterviewMode;
  packId: string;
  problemSlug?: string;
  candidateName?: string;
  questionIndex?: number;
  resumeProjects?: string[];
  metrics?: SessionMetrics;
  /** Last thing the candidate said, so the model can actually respond to it. */
  lastCandidateTurn?: string;
  code?: string;
}

interface WhiteboardBody {
  mode: "whiteboard";
  question: string;
  /** data:image/png;base64,… from the canvas. */
  image: string;
}

type Body = TutorBody | InterviewBody | WhiteboardBody;

async function callClaude(system: string, user: string, maxTokens = 700): Promise<string | null> {
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();
    return text || null;
  } catch (e) {
    console.error("[api/ai] Claude call failed, falling back to local engine:", e);
    return null;
  }
}

const TUTOR_SYSTEM = `You are the AI tutor inside RishAlgo AI, a DSA practice platform.

Rules you must follow:
- NEVER give the full solution unless the user explicitly asks for "the answer" or "the solution".
- Default to the smallest useful nudge. Escalate only when asked again.
- When asked about complexity, show the counting argument, not just the final Big-O.
- Be concise: under 200 words unless walking through a dry run.
- Use markdown. Code goes in fenced blocks.
- Speak like a good TA: direct, encouraging, never patronising.`;

function interviewSystem(packId: string, mode: InterviewMode): string {
  const pack = packById(packId);
  return `You are conducting a realistic ${pack?.name ?? "technical"} ${mode.toUpperCase()} interview inside RishAlgo AI.

Your persona: ${pack?.persona ?? "A senior engineer running a standard technical loop."}

Signals you are evaluating: ${pack?.signals.join(", ") ?? "problem solving, communication"}.

Rules:
- Stay in character as the interviewer. Never break the fourth wall.
- One question or observation at a time. Do not lecture.
- Never write the candidate's solution for them. If they are stuck, ask a leading question.
- If they have not stated complexity, ask for it.
- Keep replies under 90 words — this is spoken aloud.
- React to what they actually just said; do not read from a script.`;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── Tutor ────────────────────────────────────────────────────────
  if (body.mode === "tutor") {
    const problem = body.problemSlug ? problemBySlug(body.problemSlug) : undefined;
    const fallback = localTutor(body.question, {
      problem,
      code: body.code,
      hintLevel: body.hintLevel,
    });

    if (!hasKey()) {
      return NextResponse.json({ text: fallback, source: "local" });
    }

    const context = problem
      ? `Problem: ${problem.title} (${problem.difficulty})
Topics: ${problem.topics.join(", ")}
Statement: ${problem.description}
Constraints: ${problem.constraints.join("; ")}
Intended approach: ${problem.editorial.approach}
Target complexity: ${problem.editorial.time} time, ${problem.editorial.space} space.
Available graded hints (do not skip ahead): ${problem.hints.map((h, i) => `[${i + 1}] ${h}`).join(" ")}
The user is currently on hint level ${body.hintLevel ?? 1}.`
      : "The user has not opened a specific problem.";

    const userCode = body.code?.trim()
      ? `\n\nTheir current code:\n\`\`\`\n${body.code.slice(0, 4000)}\n\`\`\``
      : "";

    const text = await callClaude(
      TUTOR_SYSTEM,
      `${context}${userCode}\n\nTheir question: ${body.question}`,
    );
    return NextResponse.json({ text: text ?? fallback, source: text ? "claude" : "local" });
  }

  // ── Interview ────────────────────────────────────────────────────
  if (body.mode === "interview") {
    const problem = body.problemSlug ? problemBySlug(body.problemSlug) : undefined;
    const fallback = interviewerLine(body.stage, {
      packId: body.packId,
      mode: body.interviewMode,
      problem,
      candidateName: body.candidateName,
      questionIndex: body.questionIndex,
      resumeProjects: body.resumeProjects,
      metrics: body.metrics,
    });

    // The problem statement itself must be verbatim — never let the model paraphrase it.
    if (!hasKey() || body.stage === "problem" || body.stage === "welcome") {
      return NextResponse.json({ text: fallback, source: "local" });
    }

    const m = body.metrics;
    const state = [
      `Stage: ${body.stage}`,
      problem ? `Problem under discussion: ${problem.title} — target ${problem.editorial.time} time.` : "",
      m ? `Elapsed: ${Math.round(m.elapsed)}s. Tests passed: ${m.testsPassed}/${m.testsTotal}. Hints used: ${m.hintsUsed}.` : "",
      m ? `Has mentioned complexity: ${m.mentionedComplexity}. Has mentioned edge cases: ${m.mentionedEdgeCases}.` : "",
      body.code?.trim() ? `Their code so far:\n\`\`\`\n${body.code.slice(0, 3000)}\n\`\`\`` : "They have not written code yet.",
      body.lastCandidateTurn ? `They just said: "${body.lastCandidateTurn}"` : "They have not responded yet.",
    ].filter(Boolean).join("\n");

    const text = await callClaude(
      interviewSystem(body.packId, body.interviewMode),
      `${state}\n\nGive your next line as the interviewer. A scripted fallback for this stage would be: "${fallback}" — you may improve on it, but stay on the same beat.`,
      400,
    );
    return NextResponse.json({ text: text ?? fallback, source: text ? "claude" : "local" });
  }

  // ── Whiteboard (vision) ──────────────────────────────────────────
  if (body.mode === "whiteboard") {
    if (!hasKey()) {
      return NextResponse.json({
        text:
          "**Reading a drawing needs a vision model.**\n\n" +
          "The built-in engine is rule-based text only — it cannot look at an image, and guessing " +
          "what you drew would be worse than saying nothing.\n\n" +
          "Set `ANTHROPIC_API_KEY` in `.env.local` and restart the dev server to enable this.",
        source: "local",
      });
    }

    const match = /^data:image\/(png|jpeg);base64,(.+)$/.exec(body.image ?? "");
    if (!match) {
      return NextResponse.json({ error: "Expected a base64 PNG or JPEG data URL" }, { status: 400 });
    }

    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 800,
        system:
          "You are reading a hand-drawn sketch on a DSA whiteboard. Identify the structure (tree, " +
          "graph, linked list, DP table, recursion tree, array) and answer the student's question " +
          "about it. If the drawing is ambiguous or empty, say so plainly instead of guessing. " +
          "Be concise and use markdown.\n\n" +
          "Always finish with a line starting exactly `**Your turn:** ` followed by one probing " +
          "question about their drawing — why a traversal works, what the invariant is, what breaks " +
          "if an edge is added. Never answer that question yourself.",
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: match[1] === "png" ? "image/png" : "image/jpeg",
                data: match[2],
              },
            },
            { type: "text", text: body.question || "What have I drawn?" },
          ],
        }],
      });
      const text = msg.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("\n")
        .trim();
      return NextResponse.json({ text: text || "I couldn't read that drawing.", source: "claude" });
    } catch (e) {
      console.error("[api/ai] whiteboard vision call failed:", e);
      return NextResponse.json({
        text: `The vision request failed: ${e instanceof Error ? e.message : String(e)}`,
        source: "local",
      });
    }
  }

  return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({
    configured: hasKey(),
    model: hasKey() ? MODEL : null,
    note: hasKey()
      ? "Claude is wired up. Tutor and interviewer responses are model-generated."
      : "No ANTHROPIC_API_KEY set — using the built-in deterministic engine. Set the key in .env.local to enable Claude.",
  });
}
