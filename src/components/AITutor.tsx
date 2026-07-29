"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, ArrowUp, Lightbulb } from "lucide-react";
import { askTutor, aiStatus } from "@/lib/ai/client";
import { QUICK_PROMPTS } from "@/lib/ai/tutor";
import { useWorkspace } from "@/lib/workspace";
import { Markdown, Badge } from "./ui";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "tutor";
  text: string;
  source?: "claude" | "local";
}

export default function AITutor() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ configured: boolean; model: string | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { slug, code, hintLevel, bumpHint } = useWorkspace();

  useEffect(() => {
    if (open && !status) aiStatus().then(setStatus);
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open, status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  async function send(question: string) {
    if (!question.trim() || busy) return;
    const isHint = /hint|stuck|nudge/i.test(question);
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setBusy(true);

    const res = await askTutor({
      question,
      problemSlug: slug ?? undefined,
      code: code || undefined,
      hintLevel,
    });

    if (isHint) bumpHint();
    setMsgs((m) => [...m, { role: "tutor", text: res.text, source: res.source }]);
    setBusy(false);
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AI tutor" : "Open AI tutor"}
        className={cn(
          "fixed bottom-4 right-4 z-50 grid size-11 place-items-center rounded-full",
          "border border-ai/40 bg-overlay text-ai shadow-lg shadow-black/40",
          "transition-all duration-200 hover:scale-105 hover:border-ai/70",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "x" : "s"}
            initial={{ rotate: -70, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 70, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.16 }}
          >
            {open ? <X className="size-4.5" /> : <Sparkles className="size-4.5" />}
          </motion.span>
        </AnimatePresence>
        {!open && (
          <span className="absolute inset-0 -z-10 rounded-full bg-ai/25 blur-md breathe" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.2, 0.7, 0.3, 1] }}
            className="surface-raised fixed bottom-[4.25rem] right-4 z-50 flex h-[min(34rem,72vh)] w-[min(24.5rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-hairline px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-sm bg-ai/15">
                  <Sparkles className="size-3 text-ai" />
                </span>
                <span className="text-sm font-medium text-primary">AI Tutor</span>
                {slug && (
                  <span className="truncate font-mono text-2xs text-faint">{slug}</span>
                )}
              </div>
              <Badge tone={hintLevel >= 4 ? "danger" : "ai"}>
                <Lightbulb className="size-2.5" /> hint {hintLevel}/4
              </Badge>
            </div>

            {/* Thread */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
              {msgs.length === 0 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm leading-relaxed text-secondary">
                      I give <strong className="text-primary">graded hints</strong> — a nudge first,
                      the answer only if you insist.
                    </p>
                    {status && (
                      <p className="mt-2 text-2xs text-faint">
                        {status.configured
                          ? `Connected to ${status.model}.`
                          : "Built-in engine. Set ANTHROPIC_API_KEY for model-generated answers."}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => send(p)}
                        className="rounded-sm border border-edge bg-elevated px-2 py-1 text-2xs text-secondary transition-colors hover:border-ai/40 hover:text-ai"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msgs.map((m, i) => (
                <div key={i} className={cn("rise", m.role === "user" && "flex justify-end")}>
                  {m.role === "user" ? (
                    <div className="max-w-[85%] rounded-lg rounded-br-xs bg-elevated px-2.5 py-1.5 text-sm text-primary">
                      {m.text}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-hairline bg-raised px-3 py-2.5">
                      <Markdown text={m.text} />
                      {m.source === "local" && (
                        <div className="mt-2 text-2xs text-faint">built-in engine</div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {busy && (
                <div className="flex items-center gap-2 text-xs text-tertiary">
                  <span className="size-1.5 rounded-full bg-ai breathe" />
                  thinking…
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="border-t border-hairline p-2"
            >
              <div className="flex items-center gap-2 rounded-lg border border-edge bg-sunken px-2.5 py-1.5 transition-colors focus-within:border-edge-strong">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything — I won't spoil it"
                  className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-faint"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  aria-label="Send"
                  className="grid size-6 shrink-0 place-items-center rounded-sm bg-ai text-base transition-opacity disabled:opacity-25"
                >
                  <ArrowUp className="size-3.5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
