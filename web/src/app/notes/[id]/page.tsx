"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArchiveBoxIcon,
  ArchiveTrayIcon,
  Eye,
  Info,
  PencilSimple,
  Question,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { MarkdownToolbar } from "@/components/MarkdownToolbar";
import { NextNudgeCard } from "@/components/NextNudgeCard";
import { ReminderMeta } from "@/components/ReminderMeta";
import { SyncHintBanner } from "@/components/SyncHintBanner";
import { LocalOnlyBanner } from "@/components/LocalOnlyBanner";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ToastProvider";
import { apiFetch, ApiNote, ApiReminder, ApiTag } from "@/lib/api-client";
import {
  detectRemindersInNote,
  DetectedReminder,
  isDuplicateOfExisting,
  pickNextReminder,
} from "@/lib/reminder-detect";
import { useDebouncedNoteSave } from "@/hooks/useDebouncedNoteSave";
import { useOnMount } from "@/hooks/useOnMount";
import { loadUserPrefs } from "@/lib/user-prefs";
import {
  deleteLocalNote,
  getLocalNote,
  getLocalNotes,
  putLocalNote,
} from "@/lib/local-notes";
import { buildTitleToIdMap } from "@/lib/wiki-links";

const MarkdownView = dynamic(
  () => import("@/components/MarkdownView").then((m) => m.MarkdownView),
  { ssr: false },
);
const DetectedRemindersDialog = dynamic(
  () =>
    import("@/components/DetectedRemindersDialog").then(
      (m) => m.DetectedRemindersDialog,
    ),
  { ssr: false },
);
const ReminderDialog = dynamic(
  () => import("@/components/ReminderDialog").then((m) => m.ReminderDialog),
  { ssr: false },
);
const WikiLinkAutocomplete = dynamic(
  () =>
    import("@/components/WikiLinkAutocomplete").then(
      (m) => m.WikiLinkAutocomplete,
    ),
  { ssr: false },
);
const Backlinks = dynamic(
  () => import("@/components/Backlinks").then((m) => m.Backlinks),
  { ssr: false },
);
const NoteInfoPanel = dynamic(
  () => import("@/components/NoteInfoPanel").then((m) => m.NoteInfoPanel),
  { ssr: false },
);
const MarkdownCheatSheet = dynamic(
  () => import("@/components/MarkdownCheatSheet").then((m) => m.MarkdownCheatSheet),
  { ssr: false },
);

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
  const [allNotes, setAllNotes] = useState<ApiNote[]>([]);
  const [wikiAc, setWikiAc] = useState<{
    query: string;
    position: { top: number; left: number };
    insertOffset: number;
  } | null>(null);
  const [localSaveStatus, setLocalSaveStatus] = useState<
    "idle" | "pending" | "saved"
  >("idle");
  const [showInfo, setShowInfo] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [createdAt, setCreatedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const { user, loading: authLoading } = useAuth();
  const isLocal = !user;
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const { status: saveStatus, flush, retry } = useDebouncedNoteSave(
    id,
    title,
    body,
    !isLocal,
  );
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastSaveStatus = useRef(saveStatus);
  const localSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localLoaded = useRef(false);
  const allNotesLoading = useRef(false);
  const allNotesLoaded = useRef(false);

  const titleToIdMap = useMemo(
    () => buildTitleToIdMap(allNotes),
    [allNotes],
  );

  useEffect(() => {
    if (saveStatus === "error" && lastSaveStatus.current !== "error") {
      toast("Could not save note", "error", {
        label: "Retry",
        onClick: () => {
          void retry();
        },
      });
    }
    lastSaveStatus.current = saveStatus;
  }, [saveStatus, retry, toast]);

  // Debounced save to IndexedDB in local mode
  useEffect(() => {
    if (!isLocal) {
      localLoaded.current = false;
      return;
    }
    if (!localLoaded.current) {
      localLoaded.current = true;
      return;
    }
    setLocalSaveStatus("pending");
    if (localSaveTimer.current) clearTimeout(localSaveTimer.current);
    localSaveTimer.current = setTimeout(() => {
      void (async () => {
        const existing = await getLocalNote(id);
        if (!existing) return;
        await putLocalNote({
          ...existing,
          title,
          body,
          updated_at: new Date().toISOString(),
        });
        setLocalSaveStatus("saved");
      })();
    }, 700);
    return () => {
      if (localSaveTimer.current) clearTimeout(localSaveTimer.current);
    };
  }, [isLocal, id, title, body]);

  const handleBodyChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const newValue = e.target.value;
    setBody(newValue);

    const el = e.target;
    const cursorPos = el.selectionStart;
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastBracket = textBeforeCursor.lastIndexOf("[[");

    if (lastBracket !== -1) {
      const textAfterBracket = textBeforeCursor.slice(lastBracket + 2);
      if (
        !textAfterBracket.includes("]]") &&
        !textAfterBracket.includes("\n")
      ) {
        const rect = el.getBoundingClientRect();
        void ensureAllNotes();
        setWikiAc({
          query: textAfterBracket,
          position: { top: rect.bottom + 4, left: rect.left },
          insertOffset: lastBracket,
        });
        return;
      }
    }
    setWikiAc(null);
  };

  const handleWikiSelect = (note: { id: string; title: string }) => {
    if (!wikiAc) return;
    const linkText = `[[${note.title}]]`;
    const start = wikiAc.insertOffset;
    const end = start + 2 + wikiAc.query.length;
    const newBody = body.slice(0, start) + linkText + body.slice(end);
    setBody(newBody);
    setWikiAc(null);
    const newCursorPos = start + linkText.length;
    requestAnimationFrame(() => {
      bodyRef.current?.focus();
      bodyRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const load = useCallback(async () => {
    try {
      if (isLocal) {
        const [note] = await Promise.all([getLocalNote(id)]);
        if (!note) {
          setLoadError("Note not found");
          return;
        }
        setLoadError("");
        setTitle(note.title);
        setBody(note.body);
        setNoteStatus(note.status === "archived" ? "archived" : "active");
        setCreatedAt(note.created_at);
        setUpdatedAt(note.updated_at);
        setReminders([]);
        return;
      }
      const [noteRes, tagsRes, noteTagsRes] = await Promise.all([
        apiFetch<{ note: ApiNote; reminders: ApiReminder[] }>(`/notes/${id}`),
        apiFetch<{ tags: ApiTag[] }>("/tags"),
        apiFetch<{ tags: ApiTag[] }>(`/notes/${id}/tags`),
      ]);
      setLoadError("");
      setTitle(noteRes.note.title);
      setBody(noteRes.note.body);
      setNoteStatus(noteRes.note.status === "archived" ? "archived" : "active");
      setCreatedAt(noteRes.note.created_at);
      setUpdatedAt(noteRes.note.updated_at);
      setReminders(noteRes.reminders.filter((r) => r.status === "active"));
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
  }, [id, router, isLocal]);

  const ensureAllNotes = useCallback(async () => {
    if (allNotesLoaded.current || allNotesLoading.current) return;
    allNotesLoading.current = true;
    try {
      if (isLocal) {
        setAllNotes(await getLocalNotes());
      } else {
        const res = await apiFetch<{ notes: ApiNote[] }>("/notes?limit=all");
        setAllNotes(res.notes);
      }
      allNotesLoaded.current = true;
    } finally {
      allNotesLoading.current = false;
    }
  }, [isLocal]);

  useEffect(() => {
    if (!loading && !loadError) void ensureAllNotes();
  }, [loading, loadError, ensureAllNotes]);

  useOnMount(() => {
    if (!authLoading) void load();
  });

  const saveStatusLabel = () => {
    if (isLocal) {
      switch (localSaveStatus) {
        case "pending":
          return "Unsaved changes…";
        case "saved":
          return "Saved";
        default:
          return "";
      }
    }
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

  const performDelete = async () => {
    try {
      if (isLocal) {
        await deleteLocalNote(id);
        toast("Note deleted");
        router.push("/notes");
        return;
      }
      await apiFetch(`/notes/${id}`, { method: "DELETE" });
      toast("Note deleted");
      router.push("/notes");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not delete note", "error", {
        label: "Retry",
        onClick: () => {
          void performDelete();
        },
      });
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
    await performDelete();
  };

  const toggleArchive = async () => {
    const next = noteStatus === "archived" ? "active" : "archived";
    try {
      if (isLocal) {
        const existing = await getLocalNote(id);
        if (!existing) return;
        await putLocalNote({
          ...existing,
          status: next,
          updated_at: new Date().toISOString(),
        });
        setNoteStatus(next);
        toast(next === "archived" ? "Note archived" : "Note restored");
        return;
      }
      await apiFetch(`/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setNoteStatus(next);
      toast(next === "archived" ? "Note archived" : "Note restored");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not update note", "error");
    }
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
    try {
      await apiFetch(`/reminders/${reminderId}`, { method: "DELETE" });
      toast("Reminder deleted");
      await load();
      setShowSyncBanner(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not delete reminder", "error");
    }
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
    try {
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
      toast(`Added ${selected.length} reminder${selected.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not add reminders", "error");
    }
  };

  const nextReminder = pickNextReminder(reminders);
  const selectedTagIds = useMemo(
    () => new Set(noteTags.map((tag) => tag.id)),
    [noteTags],
  );

  const setNoteTagIds = async (tagIds: string[]) => {
    try {
      const res = await apiFetch<{ tags: ApiTag[] }>(`/notes/${id}/tags`, {
        method: "PUT",
        body: JSON.stringify({ tag_ids: tagIds }),
      });
      setNoteTags(res.tags);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not update tags", "error");
    }
  };

  const createTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    try {
      const res = await apiFetch<{ tag: ApiTag }>("/tags", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setNewTagName("");
      setAllTags((tags) => [...tags, res.tag].sort((a, b) => a.name.localeCompare(b.name)));
      await setNoteTagIds([...selectedTagIds, res.tag.id]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not create tag", "error");
    }
  };

  if (authLoading || loading) {
    return (
      <RequireAuth allowLocal>
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" />
      </RequireAuth>
    );
  }

  if (loadError) {
    return (
      <RequireAuth allowLocal>
        <div className="empty-state">
          <p>{loadError}</p>
          <button type="button" className="btn btn-secondary" onClick={() => void load()}>
            Try again
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => router.push("/notes")}
            style={{ marginLeft: 8 }}
          >
            Back to notes
          </button>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth allowLocal>
      {isLocal && <LocalOnlyBanner />}

      <div className="toolbar">
        <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
          <ArrowLeft size={18} />
          Back
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setPreview(!preview)}>
          <Eye size={18} />
          {preview ? "Edit" : "Preview"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setShowCheatSheet(true)}
          aria-label="Markdown cheat sheet"
        >
          <Question size={18} />
        </button>
        <button
          type="button"
          className={`btn btn-secondary ${showInfo ? "active" : ""}`}
          onClick={() => setShowInfo(!showInfo)}
          aria-label="Note info"
        >
          <Info size={18} />
        </button>
        <span className="save-status">
          {saveStatusLabel()}
          {saveStatus === "error" && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void retry()}
              style={{ marginLeft: 8 }}
            >
              Retry save
            </button>
          )}
        </span>
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
          <MarkdownView content={body} noteTitles={titleToIdMap} />
        ) : (
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="body">Body — Markdown</label>
            <MarkdownToolbar value={body} onChange={setBody} textareaRef={bodyRef} />
            <textarea
              id="body"
              ref={bodyRef}
              className="mono"
              value={body}
              onChange={handleBodyChange}
            />
            {wikiAc && (
              <WikiLinkAutocomplete
                notes={allNotes}
                query={wikiAc.query}
                position={wikiAc.position}
                onSelect={handleWikiSelect}
                onClose={() => setWikiAc(null)}
              />
            )}
          </div>
        )}
      </div>

      <Backlinks notes={allNotes} currentTitle={title} />

      {showInfo && (
        <NoteInfoPanel
          body={body}
          createdAt={createdAt}
          updatedAt={updatedAt}
        />
      )}

      {!isLocal && <NextNudgeCard reminder={nextReminder} scope="note" />}

      {!isLocal && (
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
      )}

      {!isLocal && (
        <>
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
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                No reminders on this note yet.
              </p>
            ) : (
              reminders.map((r) => (
                <div key={r.id} className="reminder-row">
                  <div>
                    <ReminderMeta fireAt={r.fire_at} repeatRule={r.repeat_rule} />
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
        </>
      )}

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

      <MarkdownCheatSheet
        open={showCheatSheet}
        onClose={() => setShowCheatSheet(false)}
      />
    </RequireAuth>
  );
}
