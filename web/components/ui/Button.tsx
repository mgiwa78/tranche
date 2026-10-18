import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { SpinnerIcon } from "@/components/icons";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary: "bg-accent text-accent-contrast hover:bg-accent-hover active:bg-accent-active",
  secondary: "border border-border-strong bg-surface text-ink hover:bg-canvas-subtle",
  ghost: "text-ink hover:bg-canvas-subtle",
  destructive: "bg-danger text-white hover:brightness-110 active:brightness-95",
};

const SIZE_STYLES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className, children, ...rest },
  ref,
) {
  const classes = [
    "press focus-ring inline-flex items-center justify-center gap-1.5 rounded-control font-medium whitespace-nowrap",
    VARIANT_STYLES[variant],
    SIZE_STYLES[size],
    (disabled || loading) && "cursor-not-allowed opacity-40",
    loading && "cursor-wait opacity-90",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button ref={ref} className={classes} disabled={disabled || loading} {...rest}>
      {loading && <SpinnerIcon className="h-4 w-4" />}
      {children}
    </button>
  );
});
