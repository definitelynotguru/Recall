"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { RequireAuth } from "@/components/RequireAuth";
import { ReminderDialog } from "@/components/ReminderDialog";
import { apiFetch, ApiNote, ApiReminder } from "@/lib/api-client";
import {
  groupRemindersByDay,
  formatFireAt,
} from "@/lib/reminder-utils";

export default function TodayPage() {
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [reminders, setReminders] = useState<ApiReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ApiReminder | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const notesRes = await apiFetch<{ notes: ApiNote[] }>("/notes");
      setNotes(notesRes.notes);
      const allReminders: ApiReminder[] = [];
      for (const n of notesRes.notes.slice(0, 50)) {
        const detail = await apiFetch<{
          note: ApiNote;
          reminders: ApiReminder[];
        }>(`/notes/${n.id}`);
        allReminders.push(...detail.reminders);
      }
      setReminders(allReminders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const groups = groupRemindersByDay(reminders);
  const noteTitle = (id: string) =>
    notes.find((n) => n.id === id)?.title || "Untitled";

  const openEdit = (r: ApiReminder) => {
    setEditingReminder(r);
    setDialogOpen(true);
  };

  const deleteReminder = async (id: string) => {
    if (!confirm("Delete this reminder?")) return;
    await apiFetch(`/reminders/${id}`, { method: "DELETE" });
    await load();
  };

  const renderItem = (r: ApiReminder, index: number) => (
    <div
      key={r.id}
      className="timeline-item-with-actions"
      style={{ "--i": index } as React.CSSProperties}
    >
      <Link href={`/notes/${r.note_id}`} className="timeline-item timeline-item-link">
        <h3>{noteTitle(r.note_id)}</h3>
        <span className="timeline-meta">{formatFireAt(r.fire_at)}</span>
        {r.repeat_rule && (
          <span className="chip" style={{ marginTop: 8 }}>
            {r.repeat_rule}
          </span>
        )}
      </Link>
      <div className="timeline-item-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={(e) => {
            e.preventDefault();
            openEdit(r);
          }}
          aria-label="Edit reminder"
        >
          <PencilSimple size={16} />
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={(e) => {
            e.preventDefault();
            deleteReminder(r.id);
          }}
          aria-label="Delete reminder"
        >
          <Trash size={16} />
        </button>
      </div>
    </div>
  );

  const section = (
    title: string,
    items: ApiReminder[],
    offset: number,
  ) =>
    items.length > 0 && (
      <div className="timeline-section">
        <p className="timeline-label">{title}</p>
        {items.map((r, i) => renderItem(r, offset + i))}
      </div>
    );

  let idx = 0;
  const activeCount = reminders.filter((r) => r.status === "active").length;

  return (
    <RequireAuth>
      <header className="page-header">
        <h1>Today</h1>
        <p>
          {activeCount > 0
            ? `${activeCount} upcoming nudge${activeCount === 1 ? "" : "s"} from your notes.`
            : "Your timeline is clear — add a reminder from any note."}
        </p>
      </header>

      {loading ? (
        <>
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" style={{ width: "85%" }} />
        </>
      ) : activeCount === 0 ? (
        <div className="empty-state">
          <p>Nothing scheduled yet.</p>
          <Link href="/notes" className="btn btn-primary">
            Open your notes
          </Link>
        </div>
      ) : (
        <div className="timeline">
          {section("Today", groups.today, idx)}
          {(idx += groups.today.length)}
          {section("Tomorrow", groups.tomorrow, idx)}
          {(idx += groups.tomorrow.length)}
          {section("This week", groups.thisWeek, idx)}
          {(idx += groups.thisWeek.length)}
          {section("Later", groups.later, idx)}
        </div>
      )}

      {editingReminder && (
        <ReminderDialog
          noteId={editingReminder.note_id}
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingReminder(null);
          }}
          onSaved={() => load()}
          reminder={editingReminder}
        />
      )}
    </RequireAuth>
  );
}
