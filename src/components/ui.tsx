"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/* ── Surfaces ────────────────────────────────────────────────────── */

export function Card({
  className,
  children,
  interactive = false,
  raised = false,
}: {
  className?: string;
  children: ReactNode;
  interactive?: boolean;
  raised?: boolean;
}) {
  return (
    <div
      className={cn(
        raised ? "surface-raised" : "surface",
        "rounded-lg",
        interactive &&
          "transition-[border-color,background-color,transform] duration-200 hover:border-edge-strong hover:bg-overlay",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ── Page header ─────────────────────────────────────────────────────
   Every page gets the same opening rhythm: eyebrow, display title,
   one line of orientation. Consistency here is what makes a product
   feel authored rather than assembled.                               */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h1 className="font-display text-3xl tracking-[-0.015em] text-primary">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-baseline justify-between gap-4", className)}>
      <h2 className="eyebrow">{children}</h2>
      {action}
    </div>
  );
}

/* ── Badge ───────────────────────────────────────────────────────── */

const TONES = {
  signal: "border-signal/25 bg-signal/10 text-signal",
  ai: "border-ai/25 bg-ai/10 text-ai",
  mint: "border-mint/25 bg-mint/10 text-mint",
  danger: "border-danger/25 bg-danger/10 text-danger",
  warn: "border-warn/25 bg-warn/10 text-warn",
  info: "border-info/25 bg-info/10 text-info",
  neutral: "border-edge bg-elevated text-secondary",
} as const;

export type Tone = keyof typeof TONES;

/** Legacy tone names from the first build still resolve. */
const TONE_ALIAS: Record<string, Tone> = {
  lime: "signal", violet: "ai", teal: "mint", coral: "danger",
  amber: "warn", azure: "info", neutral: "neutral",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone | "lime" | "violet" | "teal" | "coral" | "amber" | "azure";
  className?: string;
}) {
  const resolved = TONE_ALIAS[tone] ?? (tone as Tone);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-xs border px-1.5 py-[3px] text-2xs font-medium leading-none whitespace-nowrap",
        TONES[resolved],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Button ──────────────────────────────────────────────────────── */

export function Button({
  children,
  variant = "default",
  size = "md",
  className,
  ...props
}: {
  children: ReactNode;
  variant?: "default" | "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm font-medium",
        "transition-[background-color,border-color,color,transform,box-shadow] duration-150",
        "active:translate-y-px disabled:pointer-events-none disabled:opacity-40",
        "[&>svg]:shrink-0",
        size === "sm" && "h-7 px-2.5 text-xs [&>svg]:size-3.5",
        size === "md" && "h-8 px-3 text-sm [&>svg]:size-3.5",
        size === "lg" && "h-10 px-4 text-base [&>svg]:size-4",
        variant === "primary" &&
          "bg-signal text-on-signal shadow-[0_1px_0_rgba(255,255,255,.18)_inset,0_2px_10px_-4px_var(--color-signal)] hover:bg-signal-dim",
        variant === "default" &&
          "border border-edge bg-elevated text-primary shadow-[0_1px_0_rgba(255,255,255,.04)_inset] hover:border-edge-strong hover:bg-hover",
        variant === "outline" &&
          "border border-edge text-secondary hover:border-edge-strong hover:text-primary",
        variant === "ghost" && "text-secondary hover:bg-elevated hover:text-primary",
        variant === "danger" &&
          "border border-danger/35 bg-danger/10 text-danger hover:bg-danger/20",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ── Tabs ────────────────────────────────────────────────────────── */

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: string; label: string; badge?: ReactNode }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 overflow-x-auto border-b border-hairline",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
    >
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative shrink-0 px-2.5 py-2 text-xs font-medium transition-colors duration-150",
              on ? "text-primary" : "text-tertiary hover:text-secondary",
            )}
          >
            <span className="flex items-center gap-1.5">
              {t.label}
              {t.badge}
            </span>
            <span
              className={cn(
                "absolute inset-x-1.5 -bottom-px h-[1.5px] rounded-full transition-all duration-250",
                on ? "bg-signal opacity-100" : "bg-signal opacity-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ── Data display ────────────────────────────────────────────────── */

function barTone(value: number) {
  if (value >= 85) return "bg-signal";
  if (value >= 70) return "bg-mint";
  if (value >= 50) return "bg-warn";
  return "bg-danger";
}

export function ScoreBar({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note?: string;
  tone?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-xs text-secondary">{label}</span>
        <span className="font-mono text-xs tabular-nums text-primary">{value}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-elevated">
        <div
          className={cn("h-full rounded-full transition-[width] duration-[900ms] ease-out", tone ?? barTone(value))}
          style={{ width: `${value}%` }}
        />
      </div>
      {note && <p className="mt-1 text-2xs text-faint">{note}</p>}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "text-primary",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="surface rounded-md px-3 py-2.5">
      <div className="text-2xs uppercase tracking-[0.1em] text-faint">{label}</div>
      <div className={cn("mt-1 font-display text-2xl leading-none tabular-nums", tone)}>{value}</div>
      {sub && <div className="mt-1 text-2xs text-tertiary">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-edge px-4 py-8 text-center text-sm text-tertiary">
      {children}
    </div>
  );
}

/* ── Markdown ────────────────────────────────────────────────────────
   Renders the light subset the AI responses use: **bold**, `code`,
   fenced blocks, and dash lists.                                     */

export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/```/);
  return (
    <div className="space-y-2 text-sm leading-relaxed text-secondary">
      {blocks.map((block, bi) => {
        if (bi % 2 === 1) {
          return (
            <pre
              key={bi}
              className="overflow-x-auto rounded-sm border border-hairline bg-sunken p-2.5 font-mono text-xs leading-relaxed text-primary"
            >
              {block.replace(/^\w*\n/, "")}
            </pre>
          );
        }
        return block.split("\n").map((line, li) => {
          if (!line.trim()) return null;
          const html = line
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-primary">$1</strong>')
            .replace(/_(.+?)_/g, '<em class="text-tertiary">$1</em>')
            .replace(
              /`(.+?)`/g,
              '<code class="rounded-xs bg-elevated px-1 py-0.5 font-mono text-xs text-signal">$1</code>',
            );
          const isBullet = /^\s*[-•]\s/.test(line);
          const isNum = /^\s*\d+\.\s/.test(line);
          return (
            <p
              key={`${bi}-${li}`}
              className={cn(isBullet || isNum ? "pl-4 -indent-4" : "")}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        });
      })}
    </div>
  );
}

/* ── Keyboard hint ───────────────────────────────────────────────── */

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-xs border border-edge bg-elevated px-1 py-px font-mono text-2xs text-tertiary">
      {children}
    </kbd>
  );
}
