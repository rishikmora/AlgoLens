"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { InterviewMode } from "./ai/interview";

interface SetupState {
  packId: string;
  mode: InterviewMode;
  problemSlug: string;
  voice: boolean;
  resumeText: string;
  set: (patch: Partial<Omit<SetupState, "set">>) => void;
}

/** Survives the navigation from setup → session without stuffing a resume into the URL. */
export const useInterviewSetup = create<SetupState>()(
  persist(
    (set) => ({
      packId: "google",
      mode: "dsa",
      problemSlug: "two-sum",
      voice: true,
      resumeText: "",
      set: (patch) => set(patch),
    }),
    {
      name: "rishalgo-interview-setup",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? (undefined as never) : sessionStorage,
      ),
    },
  ),
);

/** Pulls project names out of pasted resume text so the AI can ask about them by name. */
export function extractProjects(resume: string): string[] {
  if (!resume.trim()) return [];
  const found = new Set<string>();

  // Bulleted or titled lines under a Projects heading.
  const projectSection = resume.split(/projects?\s*:?\s*\n/i)[1] ?? "";
  for (const line of projectSection.split("\n").slice(0, 25)) {
    const m = line.match(/^\s*[-•*]?\s*([A-Z][A-Za-z0-9]+(?:[ -][A-Z][A-Za-z0-9]+)*)\s*[—–\-|:(]/);
    if (m && m[1].length > 2 && m[1].length < 40) found.add(m[1].trim());
  }

  // CamelCase / PascalCase product names anywhere in the document.
  for (const m of resume.matchAll(/\b([A-Z][a-z]+[A-Z][A-Za-z]{2,})\b/g)) {
    found.add(m[1]);
  }

  return [...found].slice(0, 8);
}
