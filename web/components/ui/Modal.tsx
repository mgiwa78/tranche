"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { XIcon } from "@/components/icons";

export interface ModalHandle {
  open: () => void;
  close: () => void;
}

export interface ModalProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  /** Fires whenever the dialog closes (Esc, X button, or programmatic). */
  onClose?: () => void;
}

/** Wraps the native <dialog> element, so focus trapping and Esc-to-close come from the platform. */
export const Modal = forwardRef<ModalHandle, ModalProps>(function Modal(
  { title, description, children, className, onClose },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useImperativeHandle(ref, () => ({
    open: () => dialogRef.current?.showModal(),
    close: () => dialogRef.current?.close(),
  }));

  return (
    <dialog ref={dialogRef} className="fixed inset-0 m-auto" aria-labelledby="modal-title" onClose={onClose}>
      <div
        className={[
          "w-[calc(100vw-32px)] max-w-md rounded-surface border border-border bg-surface-raised p-6 shadow-lg",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="modal-title" className="text-lg font-semibold text-ink">
              {title}
            </h3>
            {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
            className="press focus-ring flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-control hover:bg-canvas-subtle"
          >
            <XIcon className="h-4 w-4 text-muted" />
          </button>
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </dialog>
  );
});
