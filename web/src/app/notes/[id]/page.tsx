"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Eye, FloppyDisk, Trash } from "@phosphor-icons/react";
import { RequireAuth } from "@/components/RequireAuth";
import { ReminderDialog } from "@/components/ReminderDialog";
import { MarkdownView } from "@/components/MarkdownView";
import { apiFetch, ApiNote, ApiReminder } from "@/lib/api-client";
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
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await apiFetch<{ note: ApiNote; reminders: ApiReminder[] }>(
      `/notes/${id}`,
    );
    setTitle(res.note.title);
    setBody(res.note.body);
    setReminders(res.reminders.filter((r) => r.status === "active"));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

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

  if (loading) {
    return (
      <RequireAuth>
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" />
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

      <button type="button" className="btn btn-primary" onClick={() => setDialogOpen(true)}>
        Add reminder
      </button>

      <div style={{ marginTop: 20 }}>
        {reminders.map((r) => (
          <div
            key={r.id}
            className="timeline-item"
            style={{ cursor: "default", marginBottom: 8 }}
          >
            <span className="timeline-meta">{formatFireAt(r.fire_at)}</span>
            {r.repeat_rule && (
              <span className="chip" style={{ marginTop: 8 }}>
                {r.repeat_rule}
              </span>
            )}
          </div>
        ))}
      </div>

      <ReminderDialog
        noteId={id}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => load()}
      />
    </RequireAuth>
  );
}
