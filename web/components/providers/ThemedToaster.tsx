"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/theme/theme";

/** Sonner defaults to light; follow the page so toasts don't glare in dark mode. */
export function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster position="top-right" closeButton richColors duration={5000} theme={theme} />;
}
