"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type { Lang } from "@/data/problems";
import { useTheme } from "@/lib/theme";

const MONACO_LANG: Record<Lang, string> = {
  javascript: "javascript",
  python: "python",
  cpp: "cpp",
  java: "java",
  go: "go",
  rust: "rust",
};

/* Editor themes are hand-mapped to the design tokens rather than derived,
   because Monaco needs concrete hex values at definition time. */

const DARK = {
  base: "vs-dark" as const,
  inherit: true,
  rules: [
    { token: "comment", foreground: "4a4842", fontStyle: "italic" },
    { token: "keyword", foreground: "c9a3ff" },
    { token: "string", foreground: "b8f060" },
    { token: "number", foreground: "4dd9c0" },
    { token: "type", foreground: "5fa8ff" },
    { token: "function", foreground: "f5b544" },
    { token: "variable", foreground: "f0ede7" },
  ],
  colors: {
    "editor.background": "#111316",
    "editor.foreground": "#f0ede7",
    "editorLineNumber.foreground": "#4a4842",
    "editorLineNumber.activeForeground": "#b8f060",
    "editor.selectionBackground": "#262a30",
    "editor.lineHighlightBackground": "#171a1e",
    "editorCursor.foreground": "#b8f060",
    "editorIndentGuide.background1": "#1c1f24",
    "editorIndentGuide.activeBackground1": "#363b43",
    "editorGutter.background": "#111316",
    "editorWidget.background": "#171a1e",
    "editorWidget.border": "#262a30",
    "editorSuggestWidget.background": "#171a1e",
    "editorSuggestWidget.selectedBackground": "#262a30",
    "editorBracketHighlight.foreground1": "#b8f060",
    "editorBracketHighlight.foreground2": "#c9a3ff",
    "editorBracketHighlight.foreground3": "#5fa8ff",
  },
};

const LIGHT = {
  base: "vs" as const,
  inherit: true,
  rules: [
    { token: "comment", foreground: "a9a59d", fontStyle: "italic" },
    { token: "keyword", foreground: "7040c0" },
    { token: "string", foreground: "4f7d09" },
    { token: "number", foreground: "0f7a68" },
    { token: "type", foreground: "1a63c4" },
    { token: "function", foreground: "9a6206" },
    { token: "variable", foreground: "14161a" },
  ],
  colors: {
    "editor.background": "#ffffff",
    "editor.foreground": "#14161a",
    "editorLineNumber.foreground": "#a9a59d",
    "editorLineNumber.activeForeground": "#4f7d09",
    "editor.selectionBackground": "#e6efd6",
    "editor.lineHighlightBackground": "#f6f5f1",
    "editorCursor.foreground": "#4f7d09",
    "editorIndentGuide.background1": "#eae7e1",
    "editorIndentGuide.activeBackground1": "#c8c3b9",
    "editorGutter.background": "#ffffff",
    "editorWidget.background": "#ffffff",
    "editorWidget.border": "#dfdbd3",
    "editorSuggestWidget.background": "#ffffff",
    "editorSuggestWidget.selectedBackground": "#f1efea",
    "editorBracketHighlight.foreground1": "#4f7d09",
    "editorBracketHighlight.foreground2": "#7040c0",
    "editorBracketHighlight.foreground3": "#1a63c4",
  },
};

export type EditorInstance = Parameters<OnMount>[0];

export default function CodeEditor({
  value,
  lang,
  onChange,
  onRun,
  onReady,
  readOnly = false,
  height = "100%",
}: {
  value: string;
  lang: Lang;
  onChange?: (v: string) => void;
  onRun?: () => void;
  /** Hands the editor instance out so callers can reveal a line. */
  onReady?: (editor: EditorInstance) => void;
  readOnly?: boolean;
  height?: string;
}) {
  const { theme } = useTheme();
  const runRef = useRef(onRun);
  runRef.current = onRun;
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    monacoRef.current = monaco;
    onReady?.(editor);
    monaco.editor.defineTheme("rishalgo-dark", DARK);
    monaco.editor.defineTheme("rishalgo-light", LIGHT);
    monaco.editor.setTheme(theme === "light" ? "rishalgo-light" : "rishalgo-dark");

    // Ctrl/Cmd+Enter runs, matching the Run button.
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.());
  };

  useEffect(() => {
    monacoRef.current?.editor.setTheme(theme === "light" ? "rishalgo-light" : "rishalgo-dark");
  }, [theme]);

  return (
    <Editor
      height={height}
      language={MONACO_LANG[lang]}
      value={value}
      onChange={(v) => onChange?.(v ?? "")}
      onMount={handleMount}
      loading={<div className="p-4 text-xs text-tertiary">Loading editor…</div>}
      options={{
        readOnly,
        fontSize: 13.5,
        lineHeight: 1.65,
        fontFamily: "var(--font-jetbrains), 'JetBrains Mono', Consolas, monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        padding: { top: 14, bottom: 14 },
        renderLineHighlight: "line",
        lineNumbersMinChars: 3,
        glyphMargin: false,
        folding: false,
        tabSize: 2,
        automaticLayout: true,
        multiCursorModifier: "ctrlCmd",
        formatOnPaste: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: { other: true, comments: false, strings: false },
        bracketPairColorization: { enabled: true },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        overviewRulerLanes: 0,
      }}
    />
  );
}
