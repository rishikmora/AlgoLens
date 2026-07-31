"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, TriangleAlert, Check, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, Card } from "@/components/ui";

const PERKS = [
  "Every submission kept — Wrong Answer through to Accepted",
  "Interview transcripts you can replay line by line",
  "AI chat history, like ChatGPT",
  "Saved visualizations, re-runnable any time",
  "Streaks, XP and badges that follow you across devices",
];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PROJECT_REF = SUPABASE_URL.replace(/^https:\/\//, "").split(".")[0];

/** lucide dropped brand icons in v1, so the mark is inline. */
function GitHubMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.26.8-.57v-2c-3.34.72-4.04-1.6-4.04-1.6-.54-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.8 1.31 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .31.2.68.82.57A12 12 0 0 0 12 .3Z" />
    </svg>
  );
}

/**
 * Local-development sign-in.
 *
 * Lets you exercise the real session pipeline before the GitHub provider is
 * configured — it writes the same auth cookies OAuth does, so middleware, RLS
 * and server components behave identically.
 *
 * `process.env.NODE_ENV` is inlined at build time, so this is dead code in a
 * production build. Delete it once OAuth is live.
 */
function DevEmailSignIn() {
  const { supabase } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<string | null>(null);

  if (process.env.NODE_ENV !== "development") return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setState("Signing in…");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setState(error.message);
    else window.location.href = "/dashboard";
  }

  return (
    <div className="border-t border-hairline pt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-2xs text-faint transition-colors hover:text-tertiary"
        >
          dev: sign in with email
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <div className="text-2xs text-faint">Development only — not built for production.</div>
          <input
            type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="email"
            className="h-8 w-full rounded-sm border border-edge bg-sunken px-2 text-xs text-primary outline-none focus:border-edge-strong"
          />
          <input
            type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="password"
            className="h-8 w-full rounded-sm border border-edge bg-sunken px-2 text-xs text-primary outline-none focus:border-edge-strong"
          />
          <Button type="submit" size="sm" variant="outline" className="w-full">Sign in</Button>
          {state && <div className="text-2xs text-tertiary">{state}</div>}
        </form>
      )}
    </div>
  );
}

/** Tells the user precisely why the button won't work, instead of failing silently. */
function ProviderSetupNotice() {
  return (
    <div className="space-y-2.5 rounded-md border border-warn/30 bg-warn/10 p-3">
      <div className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
        <div className="text-sm leading-relaxed text-secondary">
          <strong className="text-primary">GitHub sign-in isn&apos;t enabled yet.</strong> The
          database is connected and the code is wired — the provider just needs switching on,
          which takes a Client ID and Secret only you can create.
        </div>
      </div>

      <ol className="space-y-1.5 pl-1 text-xs leading-relaxed text-secondary">
        <li>
          <span className="text-faint">1.</span>{" "}
          <a
            href="https://github.com/settings/developers"
            target="_blank" rel="noreferrer"
            className="text-signal hover:underline"
          >
            GitHub → Developer settings → OAuth Apps → New OAuth App
            <ExternalLink className="ml-0.5 inline size-3" />
          </a>
        </li>
        <li>
          <span className="text-faint">2.</span> Homepage URL{" "}
          <code className="rounded-xs bg-elevated px-1 font-mono text-2xs">http://localhost:3000</code>
        </li>
        <li>
          <span className="text-faint">3.</span> Authorization callback URL
          <code className="mt-1 block overflow-x-auto rounded-xs bg-elevated px-1.5 py-1 font-mono text-2xs text-primary">
            {SUPABASE_URL}/auth/v1/callback
          </code>
        </li>
        <li>
          <span className="text-faint">4.</span>{" "}
          <a
            href={`https://supabase.com/dashboard/project/${PROJECT_REF}/auth/providers`}
            target="_blank" rel="noreferrer"
            className="text-signal hover:underline"
          >
            Supabase → Authentication → Providers → GitHub
            <ExternalLink className="ml-0.5 inline size-3" />
          </a>{" "}
          → paste both → Enable
        </li>
        <li>
          <span className="text-faint">5.</span>{" "}
          <a
            href={`https://supabase.com/dashboard/project/${PROJECT_REF}/auth/url-configuration`}
            target="_blank" rel="noreferrer"
            className="text-signal hover:underline"
          >
            URL Configuration
            <ExternalLink className="ml-0.5 inline size-3" />
          </a>{" "}
          → Redirect URLs → add{" "}
          <code className="rounded-xs bg-elevated px-1 font-mono text-2xs">
            http://localhost:3000/auth/callback
          </code>
        </li>
      </ol>

      <p className="text-2xs text-faint">
        Nothing else changes — this page picks it up as soon as the provider is on.
      </p>
    </div>
  );
}

export default function LoginPage() {
  const { signInWith, user, configured, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState("/dashboard");
  /** null = still checking. */
  const [githubEnabled, setGithubEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setError(params.get("error"));
    const n = params.get("next");
    if (n?.startsWith("/") && !n.startsWith("//")) setNext(n);
  }, []);

  // Ask the project which providers are live, so a disabled one is diagnosed
  // up front rather than after a dead-end redirect.
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
    })
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setGithubEnabled(Boolean(j?.external?.github)); })
      .catch(() => { if (!cancelled) setGithubEnabled(null); });
    return () => { cancelled = true; };
  }, [configured]);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      await signInWith("github", next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="grid-bg min-h-[calc(100vh-3rem)]">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_1fr]">
        <div className="rise">
          <div className="eyebrow mb-3">Sign in</div>
          <h1 className="font-display text-4xl leading-[1.05] tracking-[-0.02em] text-primary">
            Keep every attempt,
            <br />
            <em className="italic text-signal">not just the wins.</em>
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-secondary">
            Signing in moves your history off this browser and into your account, so your
            progress survives a cleared cache and follows you to another machine.
          </p>
          <ul className="mt-6 space-y-2">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-secondary">
                <Check className="mt-0.5 size-3.5 shrink-0 text-signal" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <Card className="p-6" raised>
          {!configured ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-md border border-warn/30 bg-warn/10 p-3">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
                <div className="text-sm leading-relaxed text-secondary">
                  <strong className="text-primary">Supabase isn&apos;t configured.</strong> Add{" "}
                  <code className="rounded-xs bg-elevated px-1 font-mono text-xs">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>{" "}
                  and{" "}
                  <code className="rounded-xs bg-elevated px-1 font-mono text-xs">
                    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                  </code>{" "}
                  to <code className="rounded-xs bg-elevated px-1 font-mono text-xs">.env.local</code>{" "}
                  and restart the dev server.
                </div>
              </div>
              <Link href="/problems">
                <Button variant="outline">Continue without an account <ArrowRight /></Button>
              </Link>
            </div>
          ) : user ? (
            <div className="space-y-4 text-center">
              <p className="text-md text-primary">You&apos;re already signed in.</p>
              <Link href={next}>
                <Button variant="primary" size="lg">Continue <ArrowRight /></Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-display text-xl text-primary">Continue with GitHub</h2>

              <button
                onClick={go}
                disabled={busy || loading || githubEnabled === false}
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-edge bg-elevated text-sm font-medium text-primary transition-colors hover:border-edge-strong hover:bg-hover disabled:cursor-not-allowed disabled:opacity-45"
              >
                <GitHubMark />
                {busy ? "Redirecting…" : "Sign in with GitHub"}
              </button>

              {githubEnabled === false && <ProviderSetupNotice />}

              {githubEnabled === null && (
                <p className="text-2xs text-faint">Checking provider status…</p>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">
                  <TriangleAlert className="mt-px size-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <DevEmailSignIn />

              <div className="border-t border-hairline pt-3">
                <Link href="/problems" className="text-xs text-tertiary hover:text-signal">
                  Continue without an account →
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
