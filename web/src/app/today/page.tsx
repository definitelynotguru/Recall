"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { RequireAuth } from "@/components/RequireAuth";
import { NextNudgeCard } from "@/components/NextNudgeCard";
import { ReminderDialog } from "@/components/ReminderDialog";
import { pickNextReminder } from "@/lib/reminder-detect";
import { apiFetch, ApiReminder } from "@/lib/api-client";
import {
  groupRemindersByDay,
  formatFireAt,
} from "@/lib/reminder-utils";

export default function TodayPage() {
  const [reminders, setReminders] = useState<ApiReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ApiReminder | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<{ reminders: ApiReminder[] }>(
      "/reminders?status=active&limit=all",
    );
    setReminders(res.reminders);
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const groups = groupRemindersByDay(reminders);
  const noteTitle = (id: string) =>
    reminders.find((r) => r.note_id === id)?.note_title || "Untitled";

  const openEdit = (r: ApiReminder) => {
    setEditingReminder(r);
    setDialogOpen(true);
  };

  const deleteReminder = async (id: string) => {
    if (!confirm("Delete this reminder?")) return;
    setLoading(true);
    await apiFetch(`/reminders/${id}`, { method: "DELETE" });
    await load();
  };

  const renderItem = (r: ApiReminder, index: number) => (
    <div
      key={r.id}
      className="timeline-item timeline-item-with-actions"
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="timeline-item-body">
        <Link href={`/notes/${r.note_id}`} className="timeline-item-link">
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
            onClick={() => openEdit(r)}
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
            Delete
          </button>
        </div>
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
  const nextGlobal = pickNextReminder(reminders);

  return (
    <RequireAuth>
      <NextNudgeCard reminder={nextGlobal} scope="global" />

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
          onSaved={() => {
            setLoading(true);
            load();
          }}
          reminder={editingReminder}
        />
      )}
    </RequireAuth>
  );
}
