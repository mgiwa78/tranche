import { forwardRef } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const FIELD_BASE =
  "focus-ring w-full rounded-control border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-faint disabled:cursor-not-allowed disabled:opacity-50";

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  error?: string;
}

function FieldChrome({
  label,
  hint,
  error,
  htmlFor,
  children,
}: FieldWrapperProps & { htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldWrapperProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, className, ...rest },
  ref,
) {
  const classes = [FIELD_BASE, error && "border-danger ring-2 ring-danger/20", className].filter(Boolean).join(" ");
  return (
    <FieldChrome label={label} hint={hint} error={error} htmlFor={id}>
      <input ref={ref} id={id} className={classes} {...rest} />
    </FieldChrome>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldWrapperProps {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, id, className, rows = 4, ...rest },
  ref,
) {
  const classes = [FIELD_BASE, "resize-none", error && "border-danger ring-2 ring-danger/20", className]
    .filter(Boolean)
    .join(" ");
  return (
    <FieldChrome label={label} hint={hint} error={error} htmlFor={id}>
      <textarea ref={ref} id={id} rows={rows} className={classes} {...rest} />
    </FieldChrome>
  );
});
