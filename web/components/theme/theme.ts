"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

export const THEME_KEY = "tranche-web-theme";

/**
 * Runs in <head> before first paint so a saved choice never flashes the other theme.
 * With no saved choice the attribute stays unset and globals.css follows the OS.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

const DARK_QUERY = "(prefers-color-scheme: dark)";

function resolveTheme(): Theme {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

/** The theme actually on screen: the saved choice, else the OS preference. */
export function useTheme() {
  const theme = useSyncExternalStore<Theme>(subscribe, resolveTheme, () => "light");

  function setTheme(next: Theme) {
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage unavailable: the choice lasts for this page only */
    }
  }

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
