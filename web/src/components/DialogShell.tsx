"use client";

import { X } from "@phosphor-icons/react";
import { useId, type ReactNode } from "react";
import { useDialogA11y } from "@/hooks/useDialogA11y";

type Props = {
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  maxWidth?: number;
  children: ReactNode;
  footer?: ReactNode;
  role?: "dialog" | "alertdialog";
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
};

export function DialogShell({
  onClose,
  title,
  subtitle,
  maxWidth = 480,
  children,
  footer,
  role = "dialog",
  ariaLabelledBy,
  ariaDescribedBy,
}: Props) {
  const { dialogRef, onDialogKeyDown } = useDialogA11y(onClose);
  const generatedTitleId = useId();
  const generatedDescriptionId = useId();
  const titleId = ariaLabelledBy ?? generatedTitleId;
  const descriptionId = subtitle
    ? (ariaDescribedBy ?? generatedDescriptionId)
    : ariaDescribedBy;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="dialog-sheet panel panel-pad"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onDialogKeyDown}
        style={{ maxWidth }}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <div className="dialog-header">
          <div>
            <h2
              id={titleId}
              className="dialog-title"
            >
              {title}
            </h2>
            {subtitle && (
              <p id={descriptionId} className="dialog-subtitle">
                {subtitle}
              </p>
            )}
          </div>
          <button type="button" className="btn-ghost dialog-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
        {footer && <div className="dialog-actions">{footer}</div>}
      </div>
    </div>
  );
}
