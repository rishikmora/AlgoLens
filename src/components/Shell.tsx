"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Flame, Search, Zap, Coins, Sun, Moon, ArrowRight, LogIn, LogOut,
} from "lucide-react";
import { PROBLEMS } from "@/data/problems";
import { useProgress, levelFor } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Kbd } from "./ui";
import { cn, difficultyColor } from "@/lib/utils";

const NAV = [
  { href: "/problems", label: "Practice" },
  { href: "/visualize", label: "Visualize" },
  { href: "/interview", label: "Interviews" },
  { href: "/contests", label: "Contests" },
  { href: "/learn", label: "Learn" },
  { href: "/whiteboard", label: "Whiteboard" },
];

/* ── Command palette ─────────────────────────────────────────────── */

function CommandPalette() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = q.trim()
    ? PROBLEMS.filter(
        (p) =>
          p.title.toLowerCase().includes(q.toLowerCase()) ||
          p.topics.some((t) => t.toLowerCase().includes(q.toLowerCase())) ||
          p.companies.some((c) => c.toLowerCase().includes(q.toLowerCase())),
      ).slice(0, 7)
    : PROBLEMS.slice(0, 5);

  useEffect(() => setCursor(0), [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (!open) return;
      if (e.key === "Escape") { setOpen(false); setQ(""); }
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(results.length - 1, c + 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
      if (e.key === "Enter" && results[cursor]) {
        router.push(`/problems/${results[cursor].slug}`);
        setOpen(false);
        setQ("");
      }
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open, results, cursor, router]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(true); requestAnimationFrame(() => inputRef.current?.focus()); }}
        className="hidden h-7 items-center gap-2 rounded-sm border border-edge bg-raised pl-2 pr-1.5 text-xs text-tertiary transition-colors hover:border-edge-strong hover:text-secondary md:flex"
      >
        <Search className="size-3.5" />
        <span className="w-24 text-left">Search…</span>
        <Kbd>⌘K</Kbd>
      </button>

      {open && (
        <div className="surface-raised absolute right-0 top-full z-50 mt-2 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-lg rise">
          <div className="flex items-center gap-2 border-b border-hairline px-3">
            <Search className="size-3.5 shrink-0 text-tertiary" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search problems, topics, companies…"
              className="h-10 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-faint"
            />
            <Kbd>esc</Kbd>
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {results.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-tertiary">No matches.</div>
            )}
            {results.map((p, i) => (
              <button
                key={p.slug}
                onMouseEnter={() => setCursor(i)}
                onClick={() => { router.push(`/problems/${p.slug}`); setOpen(false); setQ(""); }}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                  i === cursor ? "bg-elevated" : "hover:bg-elevated/60",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-primary">{p.title}</span>
                  <span className="block truncate text-2xs text-faint">{p.topics.join(" · ")}</span>
                </span>
                <span className={cn("shrink-0 text-2xs", difficultyColor[p.difficulty])}>
                  {p.difficulty}
                </span>
                {i === cursor && <ArrowRight className="size-3 shrink-0 text-tertiary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── User menu ───────────────────────────────────────────────────── */

function UserMenu() {
  const { user, profile, loading, configured, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  if (loading) return <span className="size-7 rounded-full bg-elevated breathe" />;

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex h-7 items-center gap-1.5 rounded-sm bg-signal px-2.5 text-xs font-medium text-on-signal transition-colors hover:bg-signal-dim"
        title={configured ? "Sign in" : "Supabase not configured"}
      >
        <LogIn className="size-3.5" />
        Sign in
      </Link>
    );
  }

  const label = profile?.name ?? user.email ?? "Account";
  const initial = label.slice(0, 1).toUpperCase();
  const handle = profile?.handle;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid size-7 place-items-center overflow-hidden rounded-full border border-edge bg-elevated text-2xs font-semibold text-primary transition-colors hover:border-edge-strong"
        aria-label="Account menu"
      >
        {profile?.photo_url ? (
          // Avatar comes from the OAuth provider's CDN; next/image would need
          // every provider host allow-listed for no real benefit at 28px.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.photo_url} alt="" className="size-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div className="surface-raised absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg rise">
          <div className="border-b border-hairline px-3 py-2.5">
            <div className="truncate text-sm text-primary">{label}</div>
            <div className="truncate text-2xs text-faint">{user.email}</div>
          </div>
          <div className="py-1">
            {[
              { href: "/dashboard", label: "Dashboard" },
              { href: handle ? `/profile/${handle}` : "/profile", label: "My profile" },
              { href: "/history", label: "History" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-1.5 text-sm text-secondary transition-colors hover:bg-elevated hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 border-t border-hairline px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-elevated hover:text-danger"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Shell ───────────────────────────────────────────────────────── */

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle, mounted: themeReady } = useTheme();
  const xp = useProgress((s) => s.xp);
  const coins = useProgress((s) => s.coins);
  const streak = useProgress((s) => s.streak);
  const touchStreak = useProgress((s) => s.touchStreak);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    touchStreak();
  }, [touchStreak]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const lvl = levelFor(xp);
  const isWorkspace = /^\/problems\/[^/]+$/.test(pathname) || pathname.startsWith("/interview/");

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className={cn(
          "sticky top-0 z-40 flex h-12 shrink-0 items-center gap-3 px-3 transition-colors duration-200",
          "bg-base/85 backdrop-blur-xl",
          scrolled || isWorkspace ? "border-b border-hairline" : "border-b border-transparent",
        )}
      >
        {/* Brand */}
        <Link href="/" className="group flex shrink-0 items-center gap-2">
          <span className="grid size-6 place-items-center rounded-sm bg-signal font-mono text-xs font-bold text-on-signal transition-transform duration-200 group-hover:scale-105">
            R
          </span>
          <span className="hidden font-display text-md tracking-tight text-primary sm:block">
            RishAlgo
          </span>
        </Link>

        <span className="hidden h-4 w-px shrink-0 bg-hairline sm:block" />

        {/* Nav */}
        <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "relative shrink-0 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors duration-150",
                  active ? "bg-elevated text-primary" : "text-tertiary hover:text-primary",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <CommandPalette />

          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="grid size-7 place-items-center rounded-sm text-tertiary transition-colors hover:bg-elevated hover:text-primary"
          >
            {themeReady && theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </button>

          {mounted && (
            <Link
              href="/dashboard"
              title={`Level ${lvl.level} — ${lvl.name}`}
              className="hidden items-center gap-2.5 rounded-sm border border-edge bg-raised px-2 py-1 font-mono text-2xs tabular-nums text-secondary transition-colors hover:border-edge-strong hover:text-primary sm:flex"
            >
              <span className="flex items-center gap-1">
                <Flame className="size-3 text-warn" />
                {streak}
              </span>
              <span className="flex items-center gap-1">
                <Coins className="size-3 text-ai" />
                {coins}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="size-3 text-signal" />
                {xp}
              </span>
            </Link>
          )}

          <UserMenu />
        </div>
      </header>

      <main className={cn("flex-1", isWorkspace && "flex min-h-0 flex-col")}>{children}</main>
    </div>
  );
}
