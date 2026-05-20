"use client";

import { useEffect, useState } from "react";
import { DownloadSimple, Copy } from "@phosphor-icons/react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch, ApiNote } from "@/lib/api-client";
import {
  loadUserPrefs,
  saveUserPrefs,
  type UserPrefs,
} from "@/lib/user-prefs";

export default function SettingsPage() {
  const { replayOnboarding } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [prefs, setPrefs] = useState<UserPrefs>(loadUserPrefs());
  const [copied, setCopied] = useState(false);
  const tz =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  useEffect(() => {
    saveUserPrefs(prefs);
  }, [prefs]);

  const buildBundle = async () => {
    const notesRes = await apiFetch<{ notes: ApiNote[] }>("/notes");
    const remindersByNote: Record<string, unknown[]> = {};
    for (const n of notesRes.notes) {
      const detail = await apiFetch<{ reminders: unknown[] }>(`/notes/${n.id}`);
      remindersByNote[n.id] = detail.reminders;
    }
    return {
      exported_at: new Date().toISOString(),
      notes: notesRes.notes,
      reminders_by_note: remindersByNote,
    };
  };

  const exportJson = async () => {
    setExporting(true);
    try {
      const bundle = await buildBundle();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recall-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const copyJson = async () => {
    setExporting(true);
    try {
      const bundle = await buildBundle();
      await navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setExporting(false);
    }
  };

  return (
    <RequireAuth>
      <header className="page-header">
        <h1>Settings</h1>
        <p>Defaults, backup, and how notifications work across devices.</p>
      </header>

      <div className="panel panel-pad" style={{ marginBottom: 20 }}>
        <h2 className="settings-heading">Reminder defaults</h2>
        <p className="settings-muted">
          Used when Fetch reminders finds a date without a time. Timezone:{" "}
          <strong>{tz}</strong> (local).
        </p>
        <div className="settings-grid">
          <div className="field">
            <label htmlFor="default-hour">Default hour (0–23)</label>
            <input
              id="default-hour"
              type="number"
              min={0}
              max={23}
              value={prefs.defaultReminderHour}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  defaultReminderHour: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="default-minute">Default minute</label>
            <input
              id="default-minute"
              type="number"
              min={0}
              max={59}
              value={prefs.defaultReminderMinute}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  defaultReminderMinute: Number(e.target.value),
                }))
              }
            />
          </div>
        </div>
        <label className="settings-check">
          <input
            type="checkbox"
            checked={prefs.showSyncHint}
            onChange={(e) =>
              setPrefs((p) => ({ ...p, showSyncHint: e.target.checked }))
            }
          />
          Show “sync on Android” hints after editing reminders
        </label>
      </div>

      <div className="panel panel-pad" style={{ marginBottom: 20 }}>
        <h2 className="settings-heading">Export vault</h2>
        <p className="settings-muted">Download or copy all notes and reminders as JSON.</p>
        <div className="reminder-actions-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={exportJson}
            disabled={exporting}
          >
            <DownloadSimple size={18} />
            {exporting ? "Working…" : "Download backup"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={copyJson}
            disabled={exporting}
          >
            <Copy size={18} />
            {copied ? "Copied" : "Copy to clipboard"}
          </button>
        </div>
      </div>

      <div className="panel panel-pad" style={{ marginBottom: 20 }}>
        <h2 className="settings-heading">Introduction</h2>
        <p className="settings-muted">Replay the three-step welcome tour.</p>
        <button type="button" className="btn btn-secondary" onClick={replayOnboarding}>
          Replay introduction
        </button>
      </div>

      <div className="panel panel-pad">
        <h2 className="settings-heading">Notifications</h2>
        <p className="settings-muted" style={{ margin: 0 }}>
          Reminders created here sync to your Android app. Your phone schedules
          and delivers every notification — this web app never pings you.
        </p>
      </div>
    </RequireAuth>
  );
}
