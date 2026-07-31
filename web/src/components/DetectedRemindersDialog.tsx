"use client";

import { useState } from "react";
import { Sparkle, X } from "@phosphor-icons/react";
import { DetectedReminder, formatConfidenceLabel } from "@/lib/reminder-detect";
import { formatRepeatLabel } from "@/lib/repeat-rules";
import { formatFireAt } from "@/lib/reminder-utils";
import { useDialogA11y } from "@/hooks/useDialogA11y";

type Props = {
  open: boolean;
  suggestions: DetectedReminder[];
  onClose: () => void;
  onAdd: (selected: DetectedReminder[]) => Promise<void>;
};

export function DetectedRemindersDialog({
  open,
  suggestions,
  onClose,
  onAdd,
}: Props) {
  if (!open) return null;

  return (
    <DetectedRemindersDialogContent
      key={suggestions.map((s) => s.id).join("|")}
      suggestions={suggestions}
      onClose={onClose}
      onAdd={onAdd}
    />
  );
}

function DetectedRemindersDialogContent({
  suggestions,
  onClose,
  onAdd,
}: Omit<Props, "open">) {
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        suggestions.filter((s) => s.confidence === "high").map((s) => s.id),
      ),
  );
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const { dialogRef, onDialogKeyDown } = useDialogA11y(onClose);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    const picks = suggestions.filter((s) => selected.has(s.id));
    if (picks.length === 0) return;
    setAdding(true);
    setError("");
    try {
      await onAdd(picks);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add reminders");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="dialog-sheet dialog-medium panel panel-pad"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onDialogKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detected-reminders-title"
        aria-describedby="detected-reminders-description"
        tabIndex={-1}
      >
        <div className="dialog-header">
          <div>
            <h2
              id="detected-reminders-title"
              className="dialog-title note-info-heading"
            >
              <Sparkle size={22} weight="duotone" color="var(--accent)" />
              Detected reminders
            </h2>
            <p id="detected-reminders-description" className="dialog-subtitle">
              We read dates and times in your note and guessed smart repeats
              (e.g. birthdays → yearly).
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {suggestions.length === 0 ? (
          <p className="dialog-copy">
            No dates or times found. Try lines like{" "}
            <code>Day: 22 · Month: October · Year: 2026</code> or{" "}
            <code>tomorrow at 9am</code> / <code>next Friday at 2pm</code>.
            Likely matches are pre-selected; review Maybe suggestions.
          </p>
        ) : (
          <ul className="detected-reminder-list">
            {suggestions.map((s) => (
              <li key={s.id}>
                <label className="detected-reminder-item">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                  />
                  <div>
                    <strong>{s.label}</strong>
                    <span className="timeline-meta meta-block">
                      {formatFireAt(s.fireAt)}
                    </span>
                    <span className="detected-reminder-tags">
                      <span className="chip">
                        {formatRepeatLabel(s.repeatRule)}
                      </span>
                      <span
                        className={`chip${s.confidence === "maybe" ? " confidence-maybe" : ""}`}
                      >
                        {formatConfidenceLabel(s.confidence)}
                      </span>
                    </span>
                    <p className="detected-reminder-reason">{s.reason}</p>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {suggestions.length > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={adding || selected.size === 0}
            >
              {adding
                ? "Adding…"
                : `Add ${selected.size} reminder${selected.size === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
