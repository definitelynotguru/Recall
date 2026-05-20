"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  FloppyDisk,
  PencilSimple,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { DetectedRemindersDialog } from "@/components/DetectedRemindersDialog";
import { ReminderDialog } from "@/components/ReminderDialog";
import { MarkdownView } from "@/components/MarkdownView";
import { apiFetch, ApiNote, ApiReminder } from "@/lib/api-client";
import {
  detectRemindersInNote,
  DetectedReminder,
  isDuplicateOfExisting,
} from "@/lib/reminder-detect";
import { formatFireAt } from "@/lib/reminder-utils";

export default function NoteDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [reminders, setReminders] = useState<ApiReminder[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ApiReminder | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [detectOpen, setDetectOpen] = useState(false);
  const [detected, setDetected] = useState<DetectedReminder[]>([]);
  const [fetching, setFetching] = useState(false);
  const { loading: authLoading } = useAuth();

  const load = async () => {
    setLoadError("");
    try {
      const res = await apiFetch<{ note: ApiNote; reminders: ApiReminder[] }>(
        `/notes/${id}`,
      );
      setTitle(res.note.title);
      setBody(res.note.body);
      setReminders(res.reminders.filter((r) => r.status === "active"));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load note";
      setLoadError(message);
      if (message.toLowerCase().includes("unauthorized")) {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    load();
  }, [id, authLoading]);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, body }),
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async () => {
    if (!confirm("Delete this note and its reminders?")) return;
    await apiFetch(`/notes/${id}`, { method: "DELETE" });
    router.push("/notes");
  };

  const openCreateDialog = () => {
    setEditingReminder(null);
    setDialogOpen(true);
  };

  const openEditDialog = (reminder: ApiReminder) => {
    setEditingReminder(reminder);
    setDialogOpen(true);
  };

  const deleteReminder = async (reminderId: string) => {
    if (!confirm("Delete this reminder?")) return;
    await apiFetch(`/reminders/${reminderId}`, { method: "DELETE" });
    await load();
  };

  const fetchReminders = async () => {
    setFetching(true);
    try {
      await save();
      const found = detectRemindersInNote(title, body).filter(
        (d) => !isDuplicateOfExisting(d, reminders),
      );
      setDetected(found);
      setDetectOpen(true);
    } finally {
      setFetching(false);
    }
  };

  const addDetectedReminders = async (selected: DetectedReminder[]) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    for (const d of selected) {
      await apiFetch<{ reminder: ApiReminder }>(`/notes/${id}/reminders`, {
        method: "POST",
        body: JSON.stringify({
          fire_at: d.fireAt,
          timezone: tz,
          repeat_rule: d.repeatRule,
        }),
      });
    }
    await load();
  };

  if (authLoading || loading) {
    return (
      <RequireAuth>
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" />
      </RequireAuth>
    );
  }

  if (loadError) {
    return (
      <RequireAuth>
        <div className="empty-state">
          <p>{loadError}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => router.push("/notes")}
          >
            Back to notes
          </button>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="toolbar">
        <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
          <ArrowLeft size={18} />
          Back
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setPreview(!preview)}>
          <Eye size={18} />
          {preview ? "Edit" : "Preview"}
        </button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          <FloppyDisk size={18} weight="fill" />
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={deleteNote}>
          <Trash size={18} />
        </button>
      </div>

      <div className="panel panel-pad" style={{ marginBottom: 28 }}>
        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 600 }}
          />
        </div>

        {preview ? (
          <MarkdownView content={body} />
        ) : (
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="body">Body — Markdown</label>
            <textarea
              id="body"
              className="mono"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        )}
      </div>

      <header className="page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.35rem" }}>Reminders</h1>
      </header>

      <div className="hint-banner">
        <span>
          <strong>Android only.</strong> Notifications fire on your phone after sync.
        </span>
      </div>

      <div className="reminder-actions-row">
        <button type="button" className="btn btn-primary" onClick={openCreateDialog}>
          Add reminder
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchReminders}
          disabled={fetching}
        >
          <Sparkle size={18} weight="duotone" />
          {fetching ? "Scanning…" : "Fetch reminders"}
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        {reminders.length === 0 ? (
          <p style={{ color: "var(--parchment-muted)", fontSize: "0.9rem" }}>
            No reminders on this note yet.
          </p>
        ) : (
          reminders.map((r) => (
            <div key={r.id} className="reminder-row">
              <div>
                <span className="timeline-meta">{formatFireAt(r.fire_at)}</span>
                {r.repeat_rule && (
                  <span className="chip" style={{ marginTop: 8, display: "inline-block" }}>
                    {r.repeat_rule}
                  </span>
                )}
              </div>
              <div className="reminder-row-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => openEditDialog(r)}
                  aria-label="Edit reminder"
                >
                  <PencilSimple size={16} />
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => deleteReminder(r.id)}
                  aria-label="Delete reminder"
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ReminderDialog
        noteId={id}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingReminder(null);
        }}
        onSaved={() => load()}
        reminder={editingReminder}
      />

      <DetectedRemindersDialog
        open={detectOpen}
        suggestions={detected}
        onClose={() => setDetectOpen(false)}
        onAdd={addDetectedReminders}
      />
    </RequireAuth>
  );
}
