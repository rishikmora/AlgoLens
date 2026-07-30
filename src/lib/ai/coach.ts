import { PROBLEMS, type Problem } from "@/data/problems";
import type { Submission, InterviewRecord } from "@/lib/store";

/**
 * Daily AI Coach.
 *
 * Reads your actual history — which topics you failed on, which you have never
 * touched, how your last interview scored — and issues a three-problem mission
 * for today. Every claim it makes is traceable to a submission or a report, so
 * it never tells you that you "struggled with DP" unless you did.
 */

export interface Mission {
  greeting: string;
  /** What happened recently that justifies today's mission. */
  observation: string;
  reason: string;
  problems: Problem[];
  focusTopic: string | null;
}

function greetingFor(hour: number, name: string): string {
  if (hour < 5) return `Still up, ${name}?`;
  if (hour < 12) return `Good morning, ${name}.`;
  if (hour < 17) return `Good afternoon, ${name}.`;
  return `Good evening, ${name}.`;
}

const DAY = 86_400_000;

/** Topics ranked by how badly recent history says you need them. */
export function weakestTopics(
  submissions: Submission[],
  solved: Record<string, string>,
): { topic: string; failed: number; solved: number; total: number; score: number }[] {
  const stats = new Map<string, { failed: number; solved: number; total: number }>();

  for (const p of PROBLEMS) {
    for (const t of p.topics) {
      const s = stats.get(t) ?? { failed: 0, solved: 0, total: 0 };
      s.total++;
      if (solved[p.slug]) s.solved++;
      stats.set(t, s);
    }
  }

  for (const sub of submissions) {
    if (sub.verdict === "Accepted") continue;
    const p = PROBLEMS.find((x) => x.slug === sub.slug);
    if (!p) continue;
    for (const t of p.topics) {
      const s = stats.get(t);
      if (s) s.failed++;
    }
  }

  return [...stats.entries()]
    .map(([topic, s]) => ({
      topic,
      ...s,
      // Unsolved coverage dominates; recent failures add urgency on top.
      score: (1 - (s.total ? s.solved / s.total : 0)) * 100 + Math.min(40, s.failed * 12),
    }))
    .sort((a, b) => b.score - a.score);
}

export function buildMission(args: {
  name: string;
  now?: Date;
  submissions: Submission[];
  solved: Record<string, string>;
  interviews: InterviewRecord[];
  streak: number;
}): Mission {
  const now = args.now ?? new Date();
  const greeting = greetingFor(now.getHours(), args.name || "there");
  const solvedSet = new Set(Object.keys(args.solved));

  const recent = args.submissions.filter((s) => now.getTime() - s.at < 3 * DAY);
  const recentFails = recent.filter((s) => s.verdict !== "Accepted");
  const ranked = weakestTopics(args.submissions, args.solved);
  const focus = ranked[0]?.topic ?? null;

  // ── What did history actually show? ──────────────────────────────
  let observation: string;
  let reason: string;

  if (args.submissions.length === 0) {
    observation = "This is your first session — nothing to go on yet.";
    reason = "Starting with arrays and hash maps, because almost everything later builds on them.";
  } else if (recentFails.length > 0) {
    const failedTopics = [...new Set(
      recentFails.flatMap((s) => PROBLEMS.find((p) => p.slug === s.slug)?.topics ?? []),
    )].slice(0, 2);
    observation =
      `You had ${recentFails.length} failed submission${recentFails.length === 1 ? "" : "s"} ` +
      `in the last few days${failedTopics.length ? `, mostly on ${failedTopics.join(" and ")}` : ""}.`;
    reason = `Today's mission targets ${focus ?? "the same pattern"} so the failure doesn't repeat.`;
  } else if (args.interviews.length > 0) {
    const last = args.interviews[0];
    const weakest = [...last.report.scores].sort((a, b) => a.value - b.value)[0];
    observation =
      `Your last mock — ${last.packName} — scored ${last.report.overall}%, ` +
      `with ${weakest.label.toLowerCase()} lowest at ${weakest.value}%.`;
    reason = weakest.label === "Communication"
      ? "Narrate your approach aloud on every problem today, even while typing."
      : `Today's set is chosen to push on ${focus ?? "your weakest topic"}.`;
  } else if (ranked[0] && ranked[0].solved === 0) {
    observation = `You haven't attempted ${ranked[0].topic} yet — it's your biggest blind spot.`;
    reason = "Three problems there will move your readiness score more than anything else.";
  } else {
    observation = `${args.streak > 1 ? `${args.streak}-day streak. ` : ""}Everything recent passed.`;
    reason = `Time to widen coverage — ${focus ?? "new topics"} is the thinnest part of your profile.`;
  }

  // ── Pick three problems: unsolved in the focus topic first ───────
  const inFocus = focus
    ? PROBLEMS.filter((p) => p.topics.includes(focus) && !solvedSet.has(p.slug))
    : [];
  const retry = recentFails
    .map((s) => PROBLEMS.find((p) => p.slug === s.slug))
    .filter((p): p is Problem => Boolean(p) && !solvedSet.has(p!.slug));
  const anyUnsolved = PROBLEMS.filter((p) => !solvedSet.has(p.slug));

  const picks: Problem[] = [];
  for (const candidate of [...retry, ...inFocus, ...anyUnsolved, ...PROBLEMS]) {
    if (picks.length === 3) break;
    if (!picks.some((p) => p.slug === candidate.slug)) picks.push(candidate);
  }

  return { greeting, observation, reason, problems: picks, focusTopic: focus };
}
