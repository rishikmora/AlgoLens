"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Pen, Trash2, Undo2, Sparkles, Download } from "lucide-react";
import { Badge, Button, Card, Markdown, PageHeader, SectionTitle } from "@/components/ui";
import { cn } from "@/lib/utils";

const COLORS = ["#ece9e3", "#b8f060", "#c9a3ff", "#4dd9c0", "#ff6b47", "#f5a623"];

const PROMPTS = [
  "What data structure have I drawn?",
  "Is this binary tree balanced?",
  "Trace a BFS over this graph",
  "Does my DP table look right?",
  "What's wrong with this linked list?",
];

export default function WhiteboardPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(2.5);
  const [question, setQuestion] = useState(PROMPTS[0]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const drawing = useRef(false);
  const history = useRef<ImageData[]>([]);

  const ctx = () => canvasRef.current?.getContext("2d") ?? null;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    g.fillStyle = "#0f1114";
    g.fillRect(0, 0, rect.width, rect.height);
    g.lineCap = "round";
    g.lineJoin = "round";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const snapshot = useCallback(() => {
    const c = canvasRef.current, g = ctx();
    if (!c || !g) return;
    history.current.push(g.getImageData(0, 0, c.width, c.height));
    if (history.current.length > 30) history.current.shift();
  }, []);

  const down = (e: React.PointerEvent) => {
    snapshot();
    drawing.current = true;
    const g = ctx();
    if (!g) return;
    const { x, y } = pos(e);
    g.beginPath();
    g.moveTo(x, y);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const g = ctx();
    if (!g) return;
    const { x, y } = pos(e);
    g.strokeStyle = tool === "eraser" ? "#0f1114" : color;
    g.lineWidth = tool === "eraser" ? 18 : width;
    g.lineTo(x, y);
    g.stroke();
  };

  const up = () => { drawing.current = false; };

  function undo() {
    const g = ctx();
    const last = history.current.pop();
    if (g && last) g.putImageData(last, 0, 0);
  }

  function clear() {
    const c = canvasRef.current, g = ctx();
    if (!c || !g) return;
    snapshot();
    g.fillStyle = "#0f1114";
    g.fillRect(0, 0, c.width, c.height);
  }

  function download() {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.download = "rishalgo-whiteboard.png";
    a.href = c.toDataURL("image/png");
    a.click();
  }

  async function ask() {
    const c = canvasRef.current;
    if (!c) return;
    setBusy(true);
    setAnswer(null);
    const dataUrl = c.toDataURL("image/png");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "whiteboard", question, image: dataUrl }),
      });
      const json = await res.json();
      setAnswer(json.text ?? json.error ?? "No response.");
    } catch (e) {
      setAnswer(`Request failed: ${String(e)}`);
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader
        eyebrow="Vision"
        title="Whiteboard"
        description="Sketch a tree, a graph, a recursion trace or a DP table — then ask the AI to read it back to you."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div>
          <Card className="p-2">
            <div className="mb-2 flex flex-wrap items-center gap-1.5 px-1">
              <Button size="sm" variant={tool === "pen" ? "primary" : "default"} onClick={() => setTool("pen")}>
                <Pen className="h-3.5 w-3.5" /> Pen
              </Button>
              <Button size="sm" variant={tool === "eraser" ? "primary" : "default"} onClick={() => setTool("eraser")}>
                <Eraser className="h-3.5 w-3.5" /> Eraser
              </Button>

              <div className="ml-1 flex items-center gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); setTool("pen"); }}
                    style={{ background: c }}
                    className={cn(
                      "h-5 w-5 rounded-full border transition-transform",
                      color === c && tool === "pen" ? "scale-110 border-ink0" : "border-line",
                    )}
                  />
                ))}
              </div>

              <label className="ml-1 flex items-center gap-1.5 text-[11.5px] text-ink2">
                size
                <input
                  type="range" min={1} max={10} step={0.5} value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-20 accent-lime"
                />
              </label>

              <div className="ml-auto flex gap-1.5">
                <Button size="sm" onClick={undo}><Undo2 className="h-3.5 w-3.5" /></Button>
                <Button size="sm" onClick={download}><Download className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="danger" onClick={clear}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerLeave={up}
              className="h-[32rem] w-full touch-none rounded-md border border-line bg-bg1"
            />
          </Card>
        </div>

        <div className="space-y-4">
          <section>
            <SectionTitle>Ask about your drawing</SectionTitle>
            <Card className="space-y-2 p-3">
              <div className="flex flex-wrap gap-1">
                {PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setQuestion(p)}
                    className={cn(
                      "rounded-xs border px-2 py-1 text-[11.5px] transition-colors",
                      question === p ? "border-lime/40 bg-lime/10 text-lime" : "border-line text-ink2 hover:text-ink0",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                className="w-full rounded-sm border border-line bg-bg0 p-2 text-[12.5px] text-ink0 outline-none focus:border-bg4"
              />
              <Button variant="primary" size="sm" onClick={ask} disabled={busy}>
                <Sparkles className="h-3.5 w-3.5" /> {busy ? "Looking…" : "Read my drawing"}
              </Button>

              {answer && (
                <div className="rise rounded-md border border-line bg-bg2 p-2.5">
                  <Markdown text={answer} />
                </div>
              )}
            </Card>
          </section>

          <Card className="p-3">
            <h3 className="mb-1.5 text-[11px] uppercase tracking-[0.12em] text-ink3">How this works</h3>
            <p className="text-[12.5px] leading-relaxed text-ink2">
              The canvas is sent as a PNG to Claude&apos;s vision API. Without{" "}
              <code className="rounded-xs bg-bg3 px-1 font-mono text-[11.5px]">ANTHROPIC_API_KEY</code>{" "}
              set, there is no local model that can read an image, so this button will tell you so
              rather than invent an answer.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge tone="violet">vision</Badge>
              <Badge>needs API key</Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
