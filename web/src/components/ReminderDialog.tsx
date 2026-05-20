"use client";

import { useEffect, useState } from "react";
import { Bell, Trash, X } from "@phosphor-icons/react";
import { apiFetch, ApiReminder } from "@/lib/api-client";
import { loadUserPrefs } from "@/lib/user-prefs";

type Props = {
  noteId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  reminder?: ApiReminder | null;
};

function fireAtToLocalFields(fireAt: string) {
  const d = new Date(fireAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function ReminderDialog({
  noteId,
  open,
  onClose,
  onSaved,
  reminder,
}: Props) {
  const isEdit = Boolean(reminder);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    if (reminder) {
      const { date: d, time: t } = fireAtToLocalFields(reminder.fire_at);
      setDate(d);
      setTime(t);
      setRepeat(reminder.repeat_rule ?? "");
    } else {
      const prefs = loadUserPrefs();
      const pad = (n: number) => String(n).padStart(2, "0");
      setDate("");
      setTime(`${pad(prefs.defaultReminderHour)}:${pad(prefs.defaultReminderMinute)}`);
      setRepeat("");
    }
  }, [open, reminder]);

  if (!open) return null;

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleSave = async () => {
    setError("");
    if (!date) {
      setError("Pick a date");
      return;
    }
    setSaving(true);
    try {
      const local = new Date(`${date}T${time}:00`);
      const payload = {
        fire_at: local.toISOString(),
        timezone: tz,
        repeat_rule: repeat || null,
      };
      if (isEdit && reminder) {
        await apiFetch<{ reminder: ApiReminder }>(`/reminders/${reminder.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch<{ reminder: ApiReminder }>(
          `/notes/${noteId}/reminders`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!reminder) return;
    if (!confirm("Delete this reminder?")) return;
    setDeleting(true);
    setError("");
    try {
      await apiFetch(`/reminders/${reminder.id}`, { method: "DELETE" });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-sheet panel panel-pad"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                margin: "0 0 6px",
                fontSize: "1.25rem",
                letterSpacing: "-0.02em",
              }}
            >
              {isEdit ? "Edit reminder" : "Schedule nudge"}
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--parchment-muted)" }}>
              Android delivers the notification
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="hint-banner">
          <Bell size={22} weight="duotone" color="var(--copper)" />
          <span>
            <strong>Phone only.</strong> You&apos;ll be notified on your Android
            device after it syncs.
          </span>
        </div>

        <div className="field">
          <label htmlFor="r-date">Date</label>
          <input
            id="r-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="r-time">Time</label>
          <input
            id="r-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="r-repeat">Repeat</label>
          <select id="r-repeat" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
            <option value="">Once</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="dialog-actions">
          {isEdit && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleDelete}
              disabled={deleting || saving}
              style={{ marginRight: "auto", color: "var(--error, #e57373)" }}
            >
              <Trash size={18} />
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || deleting}
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Set reminder"}
          </button>
        </div>
      </div>
    </div>
  );
}
