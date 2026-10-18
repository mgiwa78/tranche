"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoonIcon, SignOutIcon, SunIcon } from "@/components/icons";
import { useLogoutMutation } from "@/store/rtk/authSlice/auth.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logOut } from "@/store/slices/authSlice";
import { resetApiState } from "@/store/store";
import { selectCurrentUser, selectRefreshToken } from "@/store/selectors/authSelectors";

const THEME_KEY = "tranche-web-theme";

export function TopBar({ onOpenNav, context }: { onOpenNav?: () => void; context?: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const refreshToken = useAppSelector(selectRefreshToken);
  const [logout] = useLogoutMutation();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      const isDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDark(isDark);
      if (saved) document.documentElement.setAttribute("data-theme", saved);
    } catch {
      /* storage unavailable: keep default */
    }
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try {
      window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  async function handleSignOut() {
    try {
      if (refreshToken) await logout({ refreshToken }).unwrap();
    } catch {
      toast.message("Signed out locally; the server session may still be active.");
    }
    dispatch(logOut());
    resetApiState();
    router.replace("/auth/login");
  }

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border px-4 sm:px-8">
      <button
        type="button"
        onClick={onOpenNav}
        className="press focus-ring rounded-control px-2 py-1 text-sm text-muted hover:bg-canvas-subtle lg:hidden"
      >
        Menu
      </button>
      <div className="hidden min-w-0 text-sm text-muted lg:block">{context}</div>
      <div className="ml-auto flex items-center gap-2">
        {user && <span className="hidden text-sm text-muted sm:inline">{user.email}</span>}
        <button
          type="button"
          aria-label="Toggle theme"
          onClick={toggleTheme}
          className="press focus-ring flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-canvas-subtle"
        >
          {dark ? <SunIcon className="h-4.5 w-4.5" /> : <MoonIcon className="h-4.5 w-4.5" />}
        </button>
        <button
          type="button"
          aria-label="Sign out"
          onClick={handleSignOut}
          className="press focus-ring flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-canvas-subtle"
        >
          <SignOutIcon className="h-4.5 w-4.5" />
        </button>
      </div>
    </header>
  );
}
