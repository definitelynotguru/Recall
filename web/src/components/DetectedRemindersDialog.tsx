"use client";

import { useState } from "react";
import { Sparkle, X } from "@phosphor-icons/react";
import {
  DetectedReminder,
  formatConfidenceLabel,
  formatRepeatLabel,
} from "@/lib/reminder-detect";
import { formatFireAt } from "@/lib/reminder-utils";

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
      new Set(suggestions.filter((s) => s.confidence === "high").map((s) => s.id)),
  );
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

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
        className="dialog-sheet panel panel-pad"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                margin: "0 0 6px",
                fontSize: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Sparkle size={22} weight="duotone" color="var(--copper)" />
              Detected reminders
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--parchment-muted)" }}>
              We read dates and times in your note and guessed smart repeats (e.g.
              birthdays → yearly).
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {suggestions.length === 0 ? (
          <p style={{ color: "var(--parchment-muted)", margin: "0 0 20px" }}>
            No dates or times found. Try lines like{" "}
            <code style={{ fontSize: "0.8rem" }}>Day: 22 · Month: October · Year: 2026</code>{" "}
            or <code style={{ fontSize: "0.8rem" }}>tomorrow at 9am</code> /{" "}
            <code style={{ fontSize: "0.8rem" }}>next Friday at 2pm</code>. Likely matches are
            pre-selected; review Maybe suggestions.
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
                    <span className="timeline-meta" style={{ display: "block", marginTop: 4 }}>
                      {formatFireAt(s.fireAt)}
                    </span>
                    <span style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <span className="chip">{formatRepeatLabel(s.repeatRule)}</span>
                      <span
                        className="chip"
                        style={
                          s.confidence === "maybe"
                            ? { opacity: 0.85, borderStyle: "dashed" }
                            : undefined
                        }
                      >
                        {formatConfidenceLabel(s.confidence)}
                      </span>
                    </span>
                    <p
                      style={{
                        margin: "8px 0 0",
                        fontSize: "0.8rem",
                        color: "var(--parchment-muted)",
                      }}
                    >
                      {s.reason}
                    </p>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="error-text">{error}</p>}

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
