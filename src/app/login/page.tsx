"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, TriangleAlert, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, Card } from "@/components/ui";

const PERKS = [
  "Every submission kept — Wrong Answer through to Accepted",
  "Interview transcripts you can replay line by line",
  "AI chat history, like ChatGPT",
  "Saved visualizations, re-runnable any time",
  "Streaks, XP and badges that follow you across devices",
];

/** Inline brand marks — lucide dropped its brand icons in v1. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.06 12.25c0-.82-.07-1.6-.21-2.36H12v4.47h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.96 3.44-8.49Z" />
      <path fill="#34A853" d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.7v2.99A11.5 11.5 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.55 14.67a6.9 6.9 0 0 1 0-4.4V7.29H1.7a11.51 11.51 0 0 0 0 10.37l3.85-3Z" />
      <path fill="#EA4335" d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.29C17.71 1.2 15.1 0 12 0 7.5 0 3.62 2.58 1.7 6.34l3.85 3C6.46 6.78 9 4.75 12 4.75Z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.26.8-.57v-2c-3.34.72-4.04-1.6-4.04-1.6-.54-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.8 1.31 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .31.2.68.82.57A12 12 0 0 0 12 .3Z" />
    </svg>
  );
}

/**
 * Local-development sign-in.
 *
 * OAuth needs provider credentials configured in the Supabase dashboard, which
 * isn't always done on a fresh clone. This gives you a way to exercise the real
 * session pipeline in the meantime — it writes the same auth cookies the OAuth
 * flow does, so middleware, RLS and server components behave identically.
 *
 * `process.env.NODE_ENV` is inlined at build time, so this whole component is
 * dead code in a production build. Delete it once OAuth is live.
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
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            className="h-8 w-full rounded-sm border border-edge bg-sunken px-2 text-xs text-primary outline-none focus:border-edge-strong"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="h-8 w-full rounded-sm border border-edge bg-sunken px-2 text-xs text-primary outline-none focus:border-edge-strong"
          />
          <Button type="submit" size="sm" variant="outline" className="w-full">Sign in</Button>
          {state && <div className="text-2xs text-tertiary">{state}</div>}
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  const { signInWith, user, configured, loading } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState("/dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setError(params.get("error"));
    const n = params.get("next");
    if (n?.startsWith("/") && !n.startsWith("//")) setNext(n);
  }, []);

  async function go(provider: "google" | "github") {
    setBusy(provider);
    setError(null);
    try {
      await signInWith(provider, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
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
              <p className="text-sm text-tertiary">
                The app still works signed out — progress just stays in this browser.
              </p>
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
            <div className="space-y-3">
              <h2 className="font-display text-xl text-primary">Continue with</h2>

              <button
                onClick={() => go("google")}
                disabled={Boolean(busy) || loading}
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-edge bg-elevated text-sm font-medium text-primary transition-colors hover:border-edge-strong hover:bg-hover disabled:opacity-50"
              >
                <GoogleMark />
                {busy === "google" ? "Redirecting…" : "Google"}
              </button>

              <button
                onClick={() => go("github")}
                disabled={Boolean(busy) || loading}
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-edge bg-elevated text-sm font-medium text-primary transition-colors hover:border-edge-strong hover:bg-hover disabled:opacity-50"
              >
                <GitHubMark />
                {busy === "github" ? "Redirecting…" : "GitHub"}
              </button>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">
                  <TriangleAlert className="mt-px size-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <p className="pt-1 text-2xs leading-relaxed text-faint">
                If a provider errors with &ldquo;provider is not enabled&rdquo;, turn it on in
                Supabase → Authentication → Providers. Only your name, email and avatar are read.
              </p>

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
