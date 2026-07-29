"use client";

import { create } from "zustand";
import type { Lang } from "@/data/problems";

/**
 * Whatever the user is currently looking at. The floating tutor reads from
 * here so it can answer about the open problem and the code on screen,
 * without every page having to thread props down to it.
 */
interface WorkspaceState {
  slug: string | null;
  code: string;
  lang: Lang;
  hintLevel: number;
  set: (patch: Partial<Omit<WorkspaceState, "set" | "bumpHint" | "resetHints">>) => void;
  bumpHint: () => void;
  resetHints: () => void;
}

export const useWorkspace = create<WorkspaceState>((set) => ({
  slug: null,
  code: "",
  lang: "javascript",
  hintLevel: 1,
  set: (patch) => set(patch),
  bumpHint: () => set((s) => ({ hintLevel: Math.min(4, s.hintLevel + 1) })),
  resetHints: () => set({ hintLevel: 1 }),
}));
