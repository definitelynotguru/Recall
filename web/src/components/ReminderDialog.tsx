"use client";

import { useState } from "react";
import { Bell, Trash, X } from "@phosphor-icons/react";
import { apiFetch, ApiReminder } from "@/lib/api-client";
import { loadUserPrefs } from "@/lib/user-prefs";
import { formatRepeatLabel } from "@/lib/repeat-rules";
import { useConfirm } from "@/components/ConfirmDialog";

type Props = {
  noteId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  reminder?: ApiReminder | null;
};

const REPEAT_PRESETS = [
  { value: "", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "freq=weekly;days=MO,WE,FR", label: "Mon, Wed, Fri" },
  { value: "freq=weekly;days=SA,SU", label: "Weekends" },
  { value: "__custom__", label: "Custom…" },
] as const;

function fireAtToLocalFields(fireAt: string) {
  const d = new Date(fireAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function localFieldsToDate(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function applyQuickPick(
  pick: "10min" | "1hour" | "tonight" | "tomorrow",
  setDate: (v: string) => void,
  setTime: (v: string) => void,
) {
  const prefs = loadUserPrefs();
  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();

  if (pick === "10min") {
    now.setMinutes(now.getMinutes() + 10);
  } else if (pick === "1hour") {
    now.setHours(now.getHours() + 1);
  } else if (pick === "tonight") {
    now.setHours(20, 0, 0, 0);
    if (now.getTime() <= Date.now()) {
      now.setDate(now.getDate() + 1);
    }
  } else if (pick === "tomorrow") {
    now.setDate(now.getDate() + 1);
    now.setHours(prefs.defaultReminderHour, prefs.defaultReminderMinute, 0, 0);
  }

  setDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
}

function resolveRepeatPreset(repeat: string) {
  if (!repeat) return "";
  const match = REPEAT_PRESETS.find(
    (p) => p.value === repeat && p.value !== "__custom__",
  );
  return match ? match.value : "__custom__";
}

export function ReminderDialog({
  noteId,
  open,
  onClose,
  onSaved,
  reminder,
}: Props) {
  if (!open) return null;

  return (
    <ReminderDialogContent
      key={reminder?.id ?? "new"}
      noteId={noteId}
      onClose={onClose}
      onSaved={onSaved}
      reminder={reminder}
    />
  );
}

function initialReminderFields(reminder?: ApiReminder | null) {
  if (reminder) {
    const { date, time } = fireAtToLocalFields(reminder.fire_at);
    return {
      date,
      time,
      repeat: reminder.repeat_rule ?? "",
      reminderMode: reminder.reminder_mode ?? "once",
      nagIntervalMinutes: reminder.nag_interval_minutes ?? 5,
    };
  }

  const prefs = loadUserPrefs();
  const pad = (n: number) => String(n).padStart(2, "0");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    date: `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`,
    time: `${pad(prefs.defaultReminderHour)}:${pad(prefs.defaultReminderMinute)}`,
    repeat: "",
    reminderMode: "once",
    nagIntervalMinutes: 5,
  };
}

function ReminderDialogContent({
  noteId,
  onClose,
  onSaved,
  reminder,
}: Omit<Props, "open">) {
  const { confirm } = useConfirm();
  const isEdit = Boolean(reminder);
  const initial = initialReminderFields(reminder);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [repeat, setRepeat] = useState(initial.repeat);
  const [repeatPreset, setRepeatPreset] = useState<string>(() =>
    resolveRepeatPreset(initial.repeat),
  );
  const [reminderMode, setReminderMode] = useState(initial.reminderMode);
  const [nagIntervalMinutes, setNagIntervalMinutes] = useState(
    initial.nagIntervalMinutes,
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handlePresetChange = (value: string) => {
    setRepeatPreset(value);
    if (value !== "__custom__") setRepeat(value);
  };

  const handleSave = async () => {
    setError("");
    if (!date) {
      setError("Pick a date");
      return;
    }
    setSaving(true);
    try {
      const local = localFieldsToDate(date, time);
      const payload = {
        fire_at: local.toISOString(),
        timezone: tz,
        repeat_rule: repeat || null,
        reminder_mode: reminderMode,
        nag_interval_minutes:
          reminderMode === "persistent" ? nagIntervalMinutes : null,
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
    const ok = await confirm({
      title: "Delete reminder",
      message: "Delete this reminder?",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
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
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Android delivers the notification
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="hint-banner">
          <Bell size={22} weight="duotone" color="var(--accent)" />
          <span>
            <strong>Phone only.</strong> You&apos;ll be notified on your Android
            device after it syncs.
          </span>
        </div>

        <div className="field">
          <label>Quick picks</label>
          <div className="quick-picks">
            <button
              type="button"
              className="chip tag-chip"
              onClick={() => applyQuickPick("10min", setDate, setTime)}
            >
              +10 min
            </button>
            <button
              type="button"
              className="chip tag-chip"
              onClick={() => applyQuickPick("1hour", setDate, setTime)}
            >
              +1 hour
            </button>
            <button
              type="button"
              className="chip tag-chip"
              onClick={() => applyQuickPick("tonight", setDate, setTime)}
            >
              Tonight
            </button>
            <button
              type="button"
              className="chip tag-chip"
              onClick={() => applyQuickPick("tomorrow", setDate, setTime)}
            >
              Tomorrow
            </button>
          </div>
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
          <label htmlFor="r-repeat-preset">Repeat</label>
          <select
            id="r-repeat-preset"
            value={repeatPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {REPEAT_PRESETS.map((p) => (
              <option key={p.value || "once"} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {repeatPreset === "__custom__" && (
            <input
              id="r-repeat-advanced"
              type="text"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              placeholder="e.g. freq=weekly;days=TU,TH"
              style={{ marginTop: 10 }}
            />
          )}
          {repeat && (
            <p className="settings-muted" style={{ margin: "8px 0 0", fontSize: "0.82rem" }}>
              {formatRepeatLabel(repeat)}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="r-mode">Reminder mode</label>
          <select
            id="r-mode"
            value={reminderMode}
            onChange={(e) => setReminderMode(e.target.value)}
          >
            <option value="once">Once</option>
            <option value="persistent">Persistent (nag)</option>
            <option value="deadline">Deadline</option>
          </select>
          {reminderMode === "persistent" && (
            <input
              id="r-nag-interval"
              type="number"
              min={1}
              max={1440}
              value={nagIntervalMinutes}
              onChange={(e) => setNagIntervalMinutes(Number(e.target.value))}
              placeholder="Nag interval (minutes)"
              style={{ marginTop: 10 }}
            />
          )}
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="dialog-actions">
          {isEdit && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleDelete}
              disabled={deleting || saving}
              style={{ marginRight: "auto", color: "var(--error)" }}
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
