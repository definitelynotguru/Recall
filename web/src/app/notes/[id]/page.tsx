"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArchiveBoxIcon,
  ArchiveTrayIcon,
  Eye,
  PencilSimple,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { DetectedRemindersDialog } from "@/components/DetectedRemindersDialog";
import { ReminderDialog } from "@/components/ReminderDialog";
import { MarkdownView } from "@/components/MarkdownView";
import { NextNudgeCard } from "@/components/NextNudgeCard";
import { SyncHintBanner } from "@/components/SyncHintBanner";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ToastProvider";
import { apiFetch, ApiNote, ApiReminder, ApiTag } from "@/lib/api-client";
import {
  detectRemindersInNote,
  DetectedReminder,
  isDuplicateOfExisting,
  pickNextReminder,
} from "@/lib/reminder-detect";
import { formatRepeatLabel } from "@/lib/repeat-rules";
import { formatFireAt } from "@/lib/reminder-utils";
import { useDebouncedNoteSave } from "@/hooks/useDebouncedNoteSave";
import { loadUserPrefs } from "@/lib/user-prefs";

export default function NoteDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [noteStatus, setNoteStatus] = useState<"active" | "archived">("active");
  const [preview, setPreview] = useState(false);
  const [reminders, setReminders] = useState<ApiReminder[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ApiReminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [detectOpen, setDetectOpen] = useState(false);
  const [detected, setDetected] = useState<DetectedReminder[]>([]);
  const [allTags, setAllTags] = useState<ApiTag[]>([]);
  const [noteTags, setNoteTags] = useState<ApiTag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [fetching, setFetching] = useState(false);
  const [showSyncBanner, setShowSyncBanner] = useState(false);
  const { loading: authLoading } = useAuth();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const { status: saveStatus, flush } = useDebouncedNoteSave(id, title, body);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ note: ApiNote; reminders: ApiReminder[] }>(
        `/notes/${id}`,
      );
      setLoadError("");
      setTitle(res.note.title);
      setBody(res.note.body);
      setNoteStatus(res.note.status === "archived" ? "archived" : "active");
      setReminders(res.reminders.filter((r) => r.status === "active"));
      const [tagsRes, noteTagsRes] = await Promise.all([
        apiFetch<{ tags: ApiTag[] }>("/tags"),
        apiFetch<{ tags: ApiTag[] }>(`/notes/${id}/tags`),
      ]);
      setAllTags(tagsRes.tags);
      setNoteTags(noteTagsRes.tags);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load note";
      setLoadError(message);
      if (message.toLowerCase().includes("unauthorized")) {
        router.replace("/login?reason=session_expired");
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (authLoading) return;
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [authLoading, load]);

  const saveStatusLabel = () => {
    switch (saveStatus) {
      case "pending":
        return "Unsaved changes…";
      case "saving":
        return "Saving…";
      case "saved":
        return "Saved";
      case "error":
        return "Save failed";
      default:
        return "";
    }
  };

  const deleteNote = async () => {
    const ok = await confirm({
      title: "Delete note",
      message: "Delete this note and its reminders?",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    await apiFetch(`/notes/${id}`, { method: "DELETE" });
    toast("Note deleted");
    router.push("/notes");
  };

  const toggleArchive = async () => {
    const next = noteStatus === "archived" ? "active" : "archived";
    await apiFetch(`/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    setNoteStatus(next);
    toast(next === "archived" ? "Note archived" : "Note restored");
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
    const ok = await confirm({
      title: "Delete reminder",
      message: "Delete this reminder?",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    await apiFetch(`/reminders/${reminderId}`, { method: "DELETE" });
    toast("Reminder deleted");
    await load();
    setShowSyncBanner(true);
  };

  const fetchReminders = async () => {
    setFetching(true);
    try {
      await flush();
      const prefs = loadUserPrefs();
      const found = detectRemindersInNote(title, body, {
        defaultHour: prefs.defaultReminderHour,
        defaultMinute: prefs.defaultReminderMinute,
      }).filter((d) => !isDuplicateOfExisting(d, reminders));
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
    setShowSyncBanner(true);
  };

  const nextReminder = pickNextReminder(reminders);
  const selectedTagIds = useMemo(
    () => new Set(noteTags.map((tag) => tag.id)),
    [noteTags],
  );

  const setNoteTagIds = async (tagIds: string[]) => {
    const res = await apiFetch<{ tags: ApiTag[] }>(`/notes/${id}/tags`, {
      method: "PUT",
      body: JSON.stringify({ tag_ids: tagIds }),
    });
    setNoteTags(res.tags);
  };

  const createTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    const res = await apiFetch<{ tag: ApiTag }>("/tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setNewTagName("");
    setAllTags((tags) => [...tags, res.tag].sort((a, b) => a.name.localeCompare(b.name)));
    await setNoteTagIds([...selectedTagIds, res.tag.id]);
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
        <span className="save-status">{saveStatusLabel()}</span>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={toggleArchive}
          aria-label={noteStatus === "archived" ? "Unarchive note" : "Archive note"}
        >
          {noteStatus === "archived" ? (
            <ArchiveTrayIcon size={18} />
          ) : (
            <ArchiveBoxIcon size={18} />
          )}
          {noteStatus === "archived" ? "Unarchive" : "Archive"}
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

      <NextNudgeCard reminder={nextReminder} scope="note" />

      <div className="panel panel-pad" style={{ marginBottom: 28 }}>
        <h2 className="settings-heading">Tags</h2>
        <div className="tag-picker">
          {allTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={`chip tag-chip ${selectedTagIds.has(tag.id) ? "selected" : ""}`}
              onClick={() => {
                const next = selectedTagIds.has(tag.id)
                  ? [...selectedTagIds].filter((id) => id !== tag.id)
                  : [...selectedTagIds, tag.id];
                setNoteTagIds(next);
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
        <div className="reminder-actions-row" style={{ marginTop: 12 }}>
          <input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="New tag"
            maxLength={40}
          />
          <button type="button" className="btn btn-secondary" onClick={createTag}>
            Add tag
          </button>
        </div>
      </div>

      <header className="page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.35rem" }}>Reminders</h1>
      </header>

      {showSyncBanner && <SyncHintBanner />}

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
                    {formatRepeatLabel(r.repeat_rule)}
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
        onSaved={() => {
          load();
          setShowSyncBanner(true);
        }}
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
