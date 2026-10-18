"use client";

import { MoonIcon, SunIcon } from "@/components/icons";
import { useTheme } from "./theme";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      onClick={toggle}
      className={[
        "press focus-ring flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-canvas-subtle hover:text-ink",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dark ? <SunIcon className="h-4.5 w-4.5" /> : <MoonIcon className="h-4.5 w-4.5" />}
    </button>
  );
}
