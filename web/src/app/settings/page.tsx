"use client";

import { useEffect, useState } from "react";
import { DownloadSimple, Copy, UploadSimple, Trash } from "@phosphor-icons/react";
import {
  importBackup,
  exportBackupBundle,
  parseBackupJson,
  parseBackupPreview,
  type BackupBundle,
  type BackupPreview,
} from "@/lib/backup-import";
import { RequireAuth } from "@/components/RequireAuth";
import { ImportPreviewDialog } from "@/components/ImportPreviewDialog";
import { SettingsSection } from "@/components/SettingsSection";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch, ApiNote, ApiTag } from "@/lib/api-client";
import {
  loadUserPrefs,
  saveUserPrefs,
  type UserPrefs,
} from "@/lib/user-prefs";
import { useOnMount } from "@/hooks/useOnMount";

type SyncDevice = {
  device_id: string;
  last_sync_at: string;
};

type DebugReportRow = {
  id: string;
  created_at: string;
  device_id: string;
  app_version: string;
  summary: string;
  payload: unknown;
};

export default function SettingsPage() {
  const { replayOnboarding } = useAuth();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<BackupPreview | null>(null);
  const [pendingBundle, setPendingBundle] = useState<BackupBundle | null>(null);
  const [prefs, setPrefs] = useState<UserPrefs>(loadUserPrefs());
  const [copied, setCopied] = useState(false);
  const [tags, setTags] = useState<ApiTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [syncDevices, setSyncDevices] = useState<SyncDevice[]>([]);
  const [syncLoading, setSyncLoading] = useState(true);
  const [syncServerTime, setSyncServerTime] = useState<string | null>(null);
  const [debugReports, setDebugReports] = useState<DebugReportRow[]>([]);
  const [debugLoading, setDebugLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const tz =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  useEffect(() => {
    saveUserPrefs(prefs);
  }, [prefs]);

  const loadTags = async () => {
    try {
      const res = await apiFetch<{ tags: ApiTag[] }>("/tags");
      setTags(res.tags);
    } catch {
      setTags([]);
    } finally {
      setTagsLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const res = await apiFetch<{ devices: SyncDevice[]; server_time: string }>(
        "/sync/status",
      );
      setSyncDevices(res.devices);
      setSyncServerTime(res.server_time);
    } catch {
      setSyncDevices([]);
      setSyncServerTime(null);
    } finally {
      setSyncLoading(false);
    }
  };

  useOnMount(() => {
    void loadTags();
    void loadSyncStatus();
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch<{ reports: DebugReportRow[] }>(
          "/debug/reports?limit=20",
        );
        if (!cancelled) setDebugReports(res.reports);
      } catch {
        if (!cancelled) setDebugReports([]);
      } finally {
        if (!cancelled) setDebugLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  });

  const deleteTag = async (tag: ApiTag) => {
    const ok = await confirm({
      title: "Delete tag",
      message: `Delete "${tag.name}" from all notes?`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    await apiFetch(`/tags/${tag.id}`, { method: "DELETE" });
    toast("Tag deleted");
    await loadTags();
  };

  const exportJson = async () => {
    setExporting(true);
    try {
      const bundle = await exportBackupBundle();
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
      const bundle = await exportBackupBundle();
      await navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setImportMsg(null);
    try {
      const text = await file.text();
      const bundle = parseBackupJson(text);
      const existing = await apiFetch<{ notes: ApiNote[] }>("/notes?status=all&limit=all");
      const existingIds = new Set(existing.notes.map((n) => n.id));
      setPendingBundle(bundle);
      setImportPreview(parseBackupPreview(bundle, existingIds));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Invalid backup file", "error");
    }
  };

  const confirmImport = async () => {
    if (!pendingBundle) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const result = await importBackup(pendingBundle);
      setImportMsg(
        `Imported ${result.notes} notes and ${result.reminders} reminders.`,
      );
      toast("Backup imported");
      setPendingBundle(null);
      setImportPreview(null);
      await loadTags();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      setImportMsg(message);
      toast(message, "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <RequireAuth>
      <header className="page-header">
        <h1>Settings</h1>
        <p>Defaults, backup, and how notifications work across devices.</p>
      </header>

      <SettingsSection title="Sync status">
        <p className="settings-muted">
          Last sync times reported by your Android devices.
        </p>
        {syncLoading ? (
          <p className="settings-muted">Loading…</p>
        ) : syncDevices.length === 0 ? (
          <p className="settings-muted">
            No device syncs yet — open the Android app and pull to sync.
          </p>
        ) : (
          <ul className="sync-device-list">
            {syncDevices.map((d) => (
              <li key={d.device_id}>
                <strong>{d.device_id.slice(0, 12)}…</strong>
                <span className="timeline-meta">
                  {new Date(d.last_sync_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
        {syncServerTime && (
          <p className="settings-muted" style={{ marginBottom: 0, fontSize: "0.82rem" }}>
            Server time: {new Date(syncServerTime).toLocaleString()}
          </p>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: 12 }}
          onClick={() => {
            setSyncLoading(true);
            void loadSyncStatus();
          }}
        >
          Refresh
        </button>
      </SettingsSection>

      <SettingsSection title="Tags">
        <p className="settings-muted">Manage tags used across your notes.</p>
        {tagsLoading ? (
          <p className="settings-muted">Loading…</p>
        ) : tags.length === 0 ? (
          <p className="settings-muted">No tags yet — add them from a note.</p>
        ) : (
          <ul className="tag-manager-list">
            {tags.map((tag) => (
              <li key={tag.id}>
                <span className="chip">{tag.name}</span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => deleteTag(tag)}
                  aria-label={`Delete tag ${tag.name}`}
                >
                  <Trash size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

      <SettingsSection title="Reminder defaults">
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
      </SettingsSection>

      <SettingsSection title="Backup & restore">
        <p className="settings-muted">
          Export or import all notes and reminders as JSON. Import merges by id (updates
          existing, adds new).
        </p>
        <div className="reminder-actions-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={exportJson}
            disabled={exporting || importing}
          >
            <DownloadSimple size={18} />
            {exporting ? "Working…" : "Download backup"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={copyJson}
            disabled={exporting || importing}
          >
            <Copy size={18} />
            {copied ? "Copied" : "Copy to clipboard"}
          </button>
          <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
            <UploadSimple size={18} />
            {importing ? "Importing…" : "Import JSON"}
            <input
              type="file"
              accept="application/json,.json"
              hidden
              disabled={importing || exporting}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                await handleImportFile(file);
              }}
            />
          </label>
        </div>
        {importMsg && (
          <p
            className="settings-muted"
            style={{ marginTop: 12, marginBottom: 0 }}
            role="status"
          >
            {importMsg}
          </p>
        )}
      </SettingsSection>

      <SettingsSection title="Debug reports">
        <p className="settings-muted">
          Reports sent from Android Settings → Send debug report (sync errors, dirty
          counts, no tokens).
        </p>
        {debugLoading ? (
          <p className="settings-muted">Loading…</p>
        ) : debugReports.length === 0 ? (
          <p className="settings-muted">No reports yet.</p>
        ) : (
          <ul className="detected-reminder-list" style={{ marginTop: 12 }}>
            {debugReports.map((r) => (
              <li key={r.id} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "0.85rem" }}>
                      {new Date(r.created_at).toLocaleString()}
                    </strong>
                    <span
                      className="timeline-meta"
                      style={{ display: "block", marginTop: 4 }}
                    >
                      {r.app_version || "app"} · {r.device_id.slice(0, 8)}…
                    </span>
                    <span
                      className="timeline-meta"
                      style={{ display: "block", marginTop: 4 }}
                    >
                      {r.summary}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                      onClick={() =>
                        setExpandedId(expandedId === r.id ? null : r.id)
                      }
                    >
                      {expandedId === r.id ? "Hide" : "View JSON"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                      onClick={() =>
                        navigator.clipboard.writeText(
                          JSON.stringify(r.payload, null, 2),
                        )
                      }
                    >
                      Copy
                    </button>
                  </div>
                </div>
                {expandedId === r.id && (
                  <pre
                    style={{
                      marginTop: 10,
                      padding: 12,
                      background: "var(--ink-elevated)",
                      borderRadius: 8,
                      fontSize: "0.72rem",
                      overflow: "auto",
                      maxHeight: 320,
                    }}
                  >
                    {JSON.stringify(r.payload, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

      <SettingsSection title="Introduction">
        <p className="settings-muted">Replay the three-step welcome tour.</p>
        <button type="button" className="btn btn-secondary" onClick={replayOnboarding}>
          Replay introduction
        </button>
      </SettingsSection>

      <SettingsSection title="Notifications">
        <p className="settings-muted" style={{ margin: 0 }}>
          Reminders created here sync to your Android app. Your phone schedules
          and delivers every notification — this web app never pings you.
        </p>
      </SettingsSection>

      <ImportPreviewDialog
        open={importPreview !== null}
        preview={importPreview}
        importing={importing}
        onClose={() => {
          if (importing) return;
          setImportPreview(null);
          setPendingBundle(null);
        }}
        onConfirm={confirmImport}
      />
    </RequireAuth>
  );
}
