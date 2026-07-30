# RishAlgo AI

**Learn → Visualize → Solve → Get Interviewed → Improve**

An interactive DSA platform: LeetCode-style practice, algorithm visualization with full
replay, a step-through visual debugger built on a real interpreter, graded AI hints, and
adaptive AI mock interviews with voice.

```bash
npm install
npm run dev     # http://localhost:3000
```

`.env.local` already points at the project's Supabase instance. To enable model-generated
tutoring and interviewing, add `ANTHROPIC_API_KEY` to it — without a key everything still
runs on a built-in deterministic engine. The only feature that hard-requires the key is
whiteboard vision, which says so rather than guessing.

## One manual step: turn on the OAuth providers

Sign-in is fully wired but **Google and GitHub are disabled on the Supabase project**, and
enabling them needs OAuth credentials that only you can create. Until then the login page
renders and reports the provider error honestly.

**Google**
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → *Create
   credentials* → *OAuth client ID* → *Web application*.
2. Authorized redirect URI:
   `https://tdhjywyfaciqbgxawrqk.supabase.co/auth/v1/callback`
3. Supabase → *Authentication* → *Providers* → *Google* → paste the Client ID and Secret →
   enable.

**GitHub**
1. GitHub → *Settings* → *Developer settings* → *OAuth Apps* → *New OAuth App*.
2. Authorization callback URL: the same Supabase URL above.
3. Supabase → *Authentication* → *Providers* → *GitHub* → paste → enable.

**Both**: Supabase → *Authentication* → *URL Configuration* → add
`http://localhost:3000/auth/callback` (and your deployed equivalent) to *Redirect URLs*.

Nothing else changes — `/auth/callback` already exchanges the code for a session, and the
signup trigger provisions the user's rows automatically.

---

## What's actually built

### Practice workspace (`/problems/[slug]`)

Resizable split view. Left: Description, Constraints, Examples, Hints, Editorial,
Discussion. Right: Monaco editor over a Console / Test Cases / Custom Input / AI Review /
Visualization / Debug panel.

- **Monaco editor** with a custom theme, autocomplete, multi-cursor, bracket colorization,
  `Ctrl/Cmd+Enter` to run. Six languages selectable.
- **Judge**: JavaScript executes for real in a Web Worker with a 4-second kill switch and
  deep-equality checking. Run does 2 cases, Submit does all.
- **Drafts** auto-save per problem *and* per language.
- On an accepted submission the panel switches to the **visual replay** rather than just
  printing "Accepted".

### Replay your own solution (`/problems/[slug]` → Replay)

An accepted submission does not print "Accepted" and stop — it opens the **Replay** tab and
steps through *your* code against a real test case: the executing line highlighted, your
variables updating live (including `Map` and `Set` contents), the call stack growing and
shrinking, the heap, and running op counters. On a failed submission it auto-selects the
**first failing case**, which is the one you actually want to watch.

This runs on the interpreter below, not on a canned animation of the textbook algorithm.

### AI Pair Programmer

Not a chatbot. It reads what you are typing (debounced ~1s) and points at a **line number**:
a `while` that never advances its condition variable, `i <= arr.length`, `=` where `===` was
meant, `.sort()` with no comparator, `(lo + hi) / 2` overflow, mutation during iteration,
recursion on a DP problem with no memo, nested loops on a hash-map problem. Click a note to
jump the cursor there.

Every rule is a pattern match against a real failure mode, and it is deliberately
conservative — staying quiet beats crying wolf while someone is mid-thought.

### Daily AI Coach (`/`)

Reads your history and issues a three-problem mission for today, with the observation that
justified it: which topics you failed on recently, which you have never attempted, and the
weakest axis of your last mock interview. Every claim traces back to a stored submission or
report, so it never tells you that you "struggled with DP" unless you did.

### Visual debugger (`/problems/[slug]` → Debug)

A JavaScript-subset **lexer → parser → tree-walking interpreter** (`src/lib/interpreter.ts`)
that emits a step for every declaration, assignment, comparison, branch, loop iteration,
array write and stack frame. That buys you what `print()` cannot: **stepping backwards**.

Panels: source with the executing line highlighted, variables in the current frame, call
stack with depth, heap arrays, `print()` output, and live op/comparison/write counters.

Supports `let`/`const`/`var`, `if`/`else`, `while`, `for`, `for…of`, functions, recursion,
arrays, **object literals**, **`new Map()` / `new Set()`** with their methods, `+ - * / %`,
comparisons, `&& ||`, `++ --`, compound assignment, member/index access and assignment,
plus builtins `print len push pop max min abs floor ceil sqrt`. Guards against runaway
loops (8,000-step budget) and infinite recursion (180-frame limit).

The watch panel merges the whole scope chain of the innermost frame, so a `const seen`
declared inside a function body is visible — not hidden in a child environment.

### Visualizer (`/visualize`)

13 algorithms, each executed locally and recorded frame by frame:

| | |
|---|---|
| **Sorting** | Merge, Quick, Bubble, Insertion |
| **Searching** | Binary Search, Two Sum (hash map) |
| **Graph** | BFS, DFS |
| **DP** | Kadane, Coin Change, Climbing Stairs |
| **Other** | Sliding Window, Valid Parentheses |

Play/pause/step/step-back/replay, 0.5×–4× speed, a scrub bar with phase markers,
synchronized pseudocode highlighting, a variable watch panel, and a **live complexity
graph** plotting ops/comparisons/writes as execution proceeds. `←`/`→` step, space toggles.

### AI tutor (floating, every page)

Four **graded hint levels** — nudge → direction → name the tool → pseudocode. It refuses to
skip ahead; the level is tracked per problem. Also handles complexity explanations, dry
runs, recursion, mistake analysis against your actual code, and approach trade-offs.

With `ANTHROPIC_API_KEY` set it answers via Claude, primed with the problem's constraints,
editorial and hint ladder so it stays on-rails. Without it, a rule-based engine answers
from the same problem data.

### AI code review

Runs on submit and scores six axes — Correctness, Performance, Readability,
**Maintainability**, Naming, Edge Cases — plus a named **Alternative approach** with its
trade-off, chosen from *this* problem's topics (hash map → "sort then two pointers, O(1)
space but you lose the indices"; DP recursion with no cache → "memoize or go bottom-up"; DP
table → "collapse it to O(1)").

Every number is **derived from static analysis of your source** against the problem's own
target complexity and constraints — not from a model — so it is reproducible.

### Mock interviews (`/interview`)

Ten company packs (Google, Amazon, Meta, Microsoft, Atlassian, Adobe, Uber, Flipkart,
Rubrik, Goldman Sachs), each with its own interviewer persona, scored signals and round
structure. Three modes: **DSA**, **Behavioral**, and **Resume-based** (upload a `.txt`/`.md`
resume or paste it; project names are extracted and asked about by name).

The session follows a real interview shape — welcome → introduction → problem → coding →
optimization → follow-up → behavioral → wrap-up — with:

- **Voice both ways.** The interviewer speaks (speech synthesis); your microphone answers
  are transcribed (speech recognition). Browser-native, no vendor key. You can always type.
- **Filler-word scoring.** "um", "like", "basically", "you know" are counted as a percentage
  of words spoken — density, not a raw count — and feed a Fluency axis. Under 2% is clean;
  over 6% gets called out.
- **STAR scoring** on behavioral and resume rounds: Situation / Task / Action / Result are
  each detected from the language people actually use, and the report names which one you
  skipped. (Result is the one candidates drop most.)
- **Live coaching** triggered by behavior: silence over 25s, coding past 120 characters
  without stating complexity, coding before describing an approach.
- **A live editor the interviewer can see**, with Run tests wired to the same judge.
- **A report** whose scores come from measured session signals — talk ratio, response
  count, time to first keystroke, tests passed, longest silence, whether you raised
  complexity and edge cases unprompted.
- **Timeline replay** — click any moment to hear it again.
- **Adaptive difficulty** — a fast clean solve with no hints escalates the next problem.

### Everything else

- `/dashboard` — solved by difficulty, acceptance, 12-week activity heatmap, weak topics
  (each listing the **specific unsolved problems** to fix it), interview readiness,
  per-company readiness bars, XP/levels/coins/streak/badges.
- `/learn` — a 14-topic roadmap as a prerequisite DAG that unlocks as you solve.
- `/contests` — upcoming, virtual rounds, rating history, leaderboard.
- `/history` — every submission grouped per problem as an attempt chain (Wrong Answer →
  Accepted, with the code from each attempt), interview transcripts you can replay,
  AI chat history, and saved visualizations that re-run from a deep link.
- `/login` — Google and GitHub OAuth.
- `/profile` and `/profile/<handle>` — shareable recruiter-facing profile.
- `/whiteboard` — canvas sketching with **Claude vision** reading the drawing back to you,
  then asking *you* a question about it rather than just narrating.
- `/admin` — content and model configuration (read-only).

Signed in, all of this persists to Supabase. Signed out, progress falls back to
`localStorage`; interview setup always uses `sessionStorage`.

---

## Not built — and deliberately not faked

These were in the original brief. Rather than mock them, the UI states plainly where the
gap is.

| Feature | What's missing | Where it surfaces |
|---|---|---|
| **Python / C++ / Java / Go / Rust execution** | Docker sandbox judge service | Selecting the language shows "no local runtime"; Submit returns `Needs Sandbox` with an explanation |
| **Redis / Celery** | Caching + background jobs | Not needed yet at this scale |
| **Community discussion** | Comment tables + moderation | Discussion tab says so; sample threads are dimmed |
| **Live contests** | Scheduler + backend | Contest history is labelled seeded demo data |
| **RAG over algorithm explanations** | Vector store | Tutor uses the problem's own editorial instead |
| **PDF resume upload** | A server-side PDF text extractor | Upload accepts `.txt`/`.md`; a `.pdf` is refused with an explanation rather than silently failing |
| **System design section** | Whole feature (TinyURL, Uber, WhatsApp…) | Not started — flagged "Future" in the brief |
| **Live contest submissions & friends** | Realtime backend | Leaderboard is seeded demo data, labelled as such |

Nine problems ship in the seed set (`src/data/problems.ts`), each with full description,
constraints, examples, four graded hints, editorial and 4–6 test cases.

### Wiring up the judge service

`src/lib/judge.ts` is the single seam. `judge(lang, code, fn, tests)` currently branches on
`EXECUTABLE_LANGS`. Point the non-JavaScript branch at a sandbox endpoint returning the
same `RunOutcome` shape and every language lights up — the workspace, the interview, and
the code review all consume that one type.

---

## Layout

```
src/
  app/
    api/ai/route.ts        tutor · interviewer · whiteboard vision (Claude, with fallback)
    problems/[slug]/       practice workspace
    interview/session/     live mock interview
    …                      visualize · learn · contests · dashboard · profile · whiteboard · admin
  components/
    Workspace.tsx          the split-view practice environment
    Visualizer.tsx         frame player + bars/graph/table/stack renderers
    DebugPanel.tsx         interpreter-backed step debugger
    CodeEditor.tsx         Monaco wrapper
    AITutor.tsx            floating graded-hint tutor
  lib/
    interpreter.ts         lexer · parser · stepping interpreter
    algos.ts               13 trace generators
    judge.ts               Web Worker execution + verdicts
    ai/review.ts           static-analysis code review
    ai/interview.ts        stages, live nudges, measured report scoring
    speech.ts              speech synthesis + recognition hooks
  data/                    problems · company packs · learning path
```

`algolens.html` at the repo root is the earlier single-file prototype. Its compiler layer
was ported to TypeScript as `src/lib/interpreter.ts`; the file is kept for reference and is
not part of the build.

## Backend — Supabase

A dedicated project (`RishAlgo AI`, ref `tdhjywyfaciqbgxawrqk`, ap-south-1) holds everything
user-scoped. The judge stays independent of it: code still executes in a client-side Web
Worker and never touches the user database.

### Auth flow

```
Login → Google / GitHub OAuth → Supabase Auth → session cookie
      → middleware refreshes the JWT on every request
      → RLS enforces per-user isolation inside Postgres
```

`src/middleware.ts` refreshes the session; `/auth/callback` exchanges the OAuth code;
`getUser()` in `src/lib/supabase/server.ts` *validates* the JWT rather than trusting the
cookie. A Postgres trigger (`handle_new_user`) provisions the profile, progress and
settings rows on signup, deriving a URL-safe handle from the email and de-duplicating it.

### Tables

| Group | Tables |
|---|---|
| Identity | `profiles` (extends `auth.users`), `user_settings` |
| Progress | `progress`, `badges`, `roadmap_progress` |
| Catalogue | `problems` (public read, no client writes) |
| Coding | `submissions`, `saved_code`, `problem_notes`, `bookmarks`, `recent_views`, `custom_test_cases`, `hints_used` |
| Interviews | `interview_sessions`, `interview_messages` |
| AI | `ai_chats`, `ai_chat_messages` |
| Artifacts | `saved_visualizations`, `resumes`, `certificates`, `contest_results` |

There is no separate `users` table — `auth.users` *is* it, and `profiles` extends it 1:1.
Duplicating id/email/name into a second table just creates two things to keep in sync.

### Security

**RLS is enabled on every user table**, with policies written as
`(select auth.uid()) = user_id` so the function is evaluated once per statement rather than
once per row. `profiles` is the only table readable by anonymous visitors, and only where
`is_public` is true — the recruiter view. `resumes` is never publicly readable.

`record_submission()` is the one RPC clients call. It inserts the attempt and updates
progress in a single transaction, and **derives XP from the catalogue's own difficulty
column**, so a client cannot award itself points by editing the request body. It runs
`SECURITY INVOKER`, so RLS still applies inside it. The two `SECURITY DEFINER` trigger
helpers have had `EXECUTE` revoked from `anon` and `authenticated` — otherwise they'd be
callable over `/rest/v1/rpc`.

Verified against the live database:

| Attempt | Result |
|---|---|
| anon `SELECT` on `submissions` / `profiles` | `[]` — no leakage |
| anon `INSERT` into `submissions` | `401` RLS violation |
| anon `INSERT` into `problems` (catalogue tamper) | `401` RLS violation |
| anon `POST /rpc/touch_updated_at` | `404` — not exposed |
| anon `POST /rpc/record_submission` | `401` permission denied |
| authenticated user inserting a row owned by another `user_id` | blocked, 0 rows written |
| XP: first Medium accept → repeat accept → wrong answer | `60 → +5 → +0` = 65, `medium` counted once |

### Signed out

Everything still works. The app falls back to the persisted zustand store in
`localStorage`, and `src/components/SyncGate.tsx` swaps in remote state once a user
resolves — the database is authoritative, so a stale browser can't inflate anyone's XP.

### Where FastAPI would go

`src/lib/db.ts` is the single data-access seam. With RLS doing per-user isolation in
Postgres, simple CRUD needs no backend at all. A FastAPI service earns its place when you
move the **judge** (Docker sandbox, multi-language execution) and the **AI calls** server
side; it would verify the same Supabase JWTs and the schema would not change.

## Design system

All colour lives in `src/app/globals.css` as semantic tokens (`--color-base`,
`--color-raised`, `--color-primary`, `--color-signal`…), overridden wholesale under
`[data-theme="light"]`. Components never name a theme — light mode is one attribute flip on
`<html>`, applied by an inline script before first paint so there is no flash.

**Accent discipline** is the rule that keeps it calm:

| Token | Means |
|---|---|
| `signal` (lime) | primary action · success · the element executing *right now* |
| `ai` (violet) | anything the model produced |
| `warn` (amber) | attention, comparisons in flight |
| `danger` (coral) | failure, destructive writes |
| `info` (azure) | neutral data |

Everything else is greyscale. Type is three roles: **Instrument Serif** for display,
**Inter** for UI, **JetBrains Mono** for code and metrics, on a fixed 11→60px scale — no
arbitrary sizes.

## Stack

Next.js 15 · React 19 · TypeScript 5 · Tailwind CSS 4 · Supabase (Postgres, Auth, RLS) ·
Monaco Editor · Framer Motion · Zustand · Anthropic SDK. No D3/Three.js — the
visualizations are hand-rolled SVG and CSS, and the fonts are self-hosted by `next/font`,
which keeps the bundle at ~103 kB shared JS.

Regenerate database types after any migration:

```bash
npx supabase gen types typescript --project-id tdhjywyfaciqbgxawrqk > src/lib/supabase/types.ts
```
