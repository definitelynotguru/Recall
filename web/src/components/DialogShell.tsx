"use client";

import { X } from "@phosphor-icons/react";
import type { CSSProperties, ReactNode } from "react";

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
  const sheetStyle: CSSProperties = { maxWidth };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-sheet panel panel-pad"
        onClick={(e) => e.stopPropagation()}
        style={sheetStyle}
        role={role}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: subtitle ? 20 : 16,
          }}
        >
          <div>
            <h2
              id={ariaLabelledBy}
              style={{
                fontFamily: "var(--font-display)",
                margin: subtitle ? "0 0 6px" : 0,
                fontSize: "1.25rem",
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                id={ariaDescribedBy}
                style={{ margin: 0, fontSize: "0.85rem", color: "var(--parchment-muted)" }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
        {footer && <div className="dialog-actions">{footer}</div>}
      </div>
    </div>
  );
}
