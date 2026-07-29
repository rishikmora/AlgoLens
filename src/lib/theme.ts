"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const KEY = "rishalgo-theme";

/**
 * Reads the theme that the inline boot script already applied to <html>,
 * so the hook never re-decides it and never causes a flash.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as Theme) ?? "dark";
    setTheme(current);
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    const root = document.documentElement;
    const next: Theme = (root.getAttribute("data-theme") as Theme) === "dark" ? "light" : "dark";

    // Suppress transitions for one frame so the whole page swaps at once.
    root.classList.add("theme-switching");
    root.setAttribute("data-theme", next);
    window.setTimeout(() => root.classList.remove("theme-switching"), 0);

    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode — the choice just won't persist */
    }
    setTheme(next);
  }, []);

  return { theme, toggle, mounted };
}
