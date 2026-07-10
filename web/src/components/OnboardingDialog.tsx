"use client";

import { useState } from "react";
import { X, Check } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api-client";
import { DEFAULT_TEMPLATES, expandTemplate } from "@/lib/templates";

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
        className="dialog-sheet panel panel-pad"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              margin: 0,
              fontSize: "1.35rem",
            }}
          >
            Welcome to Recall
          </h2>
          <button type="button" className="btn-ghost" onClick={dismiss} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 16 }}>
          How will you use Recall? We&apos;ll create editable starter notes you can tweak or delete.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {SURVEY_OPTIONS.map((opt) => {
            const on = selected.has(opt.index);
            return (
              <button
                key={opt.index}
                type="button"
                onClick={() => toggle(opt.index)}
                aria-pressed={on}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: on ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: on ? "var(--accent-soft, rgba(212,165,116,0.12))" : "transparent",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    border: on ? "none" : "1px solid var(--border)",
                    background: on ? "var(--accent)" : "transparent",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {on && <Check size={14} color="var(--bg)" />}
                </span>
                <span>
                  <strong style={{ display: "block", fontSize: "0.95rem" }}>{opt.label}</strong>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{opt.title}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={dismiss} style={{ flex: 1 }}>
            Skip
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 2 }}
            disabled={selected.size === 0 || creating}
            onClick={() => void createStarterNotes()}
          >
            {creating ? "Creating…" : `Create ${selected.size} starter note${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
