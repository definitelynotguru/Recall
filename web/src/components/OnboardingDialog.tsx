"use client";

import { useState } from "react";
import { X, Check } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api-client";
import { DEFAULT_TEMPLATES, expandTemplate } from "@/lib/templates";
import { useDialogA11y } from "@/hooks/useDialogA11y";

type Props = {
  open: boolean;
  onClose: () => void;
};

const SURVEY_OPTIONS = DEFAULT_TEMPLATES.map((t, i) => ({
  index: i,
  label:
    i === 0
      ? "Daily journaling"
      : i === 1
        ? "Meeting notes"
        : "Project planning",
  title: t.title,
  body: t.body,
}));

export function OnboardingDialog({ open, onClose }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set([0]));
  const [creating, setCreating] = useState(false);
  const { dialogRef, onDialogKeyDown } = useDialogA11y(onClose, open);

  if (!open) return null;

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const dismiss = () => {
    onClose();
  };

  const createStarterNotes = async () => {
    setCreating(true);
    try {
      for (const i of selected) {
        const opt = SURVEY_OPTIONS[i];
        await apiFetch("/notes", {
          method: "POST",
          body: JSON.stringify({
            id: crypto.randomUUID(),
            title: opt.title,
            body: expandTemplate(opt.body),
          }),
        });
      }
    } catch {
      // best-effort: starter notes are optional
    } finally {
      setCreating(false);
      window.dispatchEvent(new Event("recall:notes-changed"));
      dismiss();
    }
  };

  return (
    <div className="dialog-overlay" onClick={dismiss}>
      <div
        ref={dialogRef}
        className="dialog-sheet panel panel-pad"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onDialogKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        tabIndex={-1}
      >
        <div className="dialog-header">
          <h2 id="onboarding-title" className="dialog-title">
            Welcome to Recall
          </h2>
          <button
            type="button"
            className="btn-ghost"
            onClick={dismiss}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <p id="onboarding-description" className="dialog-copy">
          How will you use Recall? We&apos;ll create editable starter notes you
          can tweak or delete.
        </p>

        <div className="onboarding-options">
          {SURVEY_OPTIONS.map((opt) => {
            const on = selected.has(opt.index);
            return (
              <button
                key={opt.index}
                type="button"
                onClick={() => toggle(opt.index)}
                aria-pressed={on}
                className="onboarding-option"
              >
                <span className="onboarding-check">
                  {on && <Check size={14} />}
                </span>
                <span>
                  <strong className="onboarding-option-title">
                    {opt.label}
                  </strong>
                  <span className="onboarding-option-note">{opt.title}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="onboarding-actions">
          <button type="button" className="btn btn-ghost" onClick={dismiss}>
            Skip
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={selected.size === 0 || creating}
            onClick={() => void createStarterNotes()}
          >
            {creating
              ? "Creating…"
              : `Create ${selected.size} starter note${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
