"use client";

import { useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import { RequireAuth } from "@/components/RequireAuth";
import { apiFetch, ApiNote } from "@/lib/api-client";

export default function SettingsPage() {
  const [exporting, setExporting] = useState(false);

  const exportJson = async () => {
    setExporting(true);
    try {
      const notesRes = await apiFetch<{ notes: ApiNote[] }>("/notes");
      const remindersByNote: Record<string, unknown[]> = {};
      for (const n of notesRes.notes) {
        const detail = await apiFetch<{ reminders: unknown[] }>(`/notes/${n.id}`);
        remindersByNote[n.id] = detail.reminders;
      }
      const bundle = {
        exported_at: new Date().toISOString(),
        notes: notesRes.notes,
        reminders_by_note: remindersByNote,
      };
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

  return (
    <RequireAuth>
      <header className="page-header">
        <h1>Settings</h1>
        <p>Backup and how notifications work across devices.</p>
      </header>

      <div className="panel panel-pad" style={{ marginBottom: 20 }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.1rem",
            margin: "0 0 8px",
          }}
        >
          Export vault
        </h2>
        <p style={{ color: "var(--parchment-muted)", margin: "0 0 20px", fontSize: "0.9rem" }}>
          Download all notes and reminders as JSON.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={exportJson}
          disabled={exporting}
        >
          <DownloadSimple size={18} />
          {exporting ? "Exporting…" : "Download backup"}
        </button>
      </div>

      <div className="panel panel-pad">
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.1rem",
            margin: "0 0 8px",
          }}
        >
          Notifications
        </h2>
        <p style={{ color: "var(--parchment-muted)", margin: 0, fontSize: "0.9rem" }}>
          Reminders created here sync to your Android app. Your phone schedules
          and delivers every notification — this web app never pings you.
        </p>
      </div>
    </RequireAuth>
  );
}
