"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SignOutIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useLogoutMutation } from "@/store/rtk/authSlice/auth.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logOut } from "@/store/slices/authSlice";
import { resetApiState } from "@/store/store";
import { selectCurrentUser, selectRefreshToken } from "@/store/selectors/authSelectors";

export function TopBar({ onOpenNav, context }: { onOpenNav?: () => void; context?: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const refreshToken = useAppSelector(selectRefreshToken);
  const [logout] = useLogoutMutation();

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
        <ThemeToggle />
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
