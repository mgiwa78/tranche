"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { WarningIcon } from "@/components/icons";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * ConfirmProvider + useConfirm(): a promise-based confirm() replacing window.confirm, mounted once
 * at the app root. Built on the native <dialog> element for focus trapping and Esc-to-close.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    dialogRef.current?.showModal();
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function settle(value: boolean) {
    dialogRef.current?.close();
    resolveRef.current?.(value);
    resolveRef.current = null;
  }

  const isDanger = options?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto"
        onCancel={() => settle(false)}
        aria-labelledby="confirm-title"
      >
        <div className="w-[calc(100vw-32px)] max-w-sm rounded-surface border border-border bg-surface-raised p-6 shadow-lg">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isDanger ? "bg-danger-bg" : "bg-info-bg"
            }`}
          >
            <WarningIcon className={`h-5 w-5 ${isDanger ? "text-danger" : "text-info"}`} />
          </div>
          <h3 id="confirm-title" className="mt-4 text-lg font-semibold text-ink">
            {options?.title}
          </h3>
          <p className="mt-1.5 text-sm text-muted">{options?.message}</p>
          <div className="mt-6 flex justify-end gap-2.5">
            <Button variant="secondary" size="sm" onClick={() => settle(false)}>
              {options?.cancelLabel ?? "Cancel"}
            </Button>
            <Button variant={isDanger ? "destructive" : "primary"} size="sm" onClick={() => settle(true)}>
              {options?.confirmLabel ?? "Confirm"}
            </Button>
          </div>
        </div>
      </dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
