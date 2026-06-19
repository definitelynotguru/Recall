"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Check, Clock, PencilSimple, Trash } from "@phosphor-icons/react";
import { RequireAuth } from "@/components/RequireAuth";
import { NextNudgeCard } from "@/components/NextNudgeCard";
import { ReminderDialog } from "@/components/ReminderDialog";
import { ReminderMeta } from "@/components/ReminderMeta";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ToastProvider";
import { useOnMount } from "@/hooks/useOnMount";
import { pickNextReminder } from "@/lib/reminder-detect";
import { apiFetch, ApiReminder } from "@/lib/api-client";
import { groupRemindersByDay } from "@/lib/reminder-utils";

function snoozeFireAt(minutes: number) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export default function TodayPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<ApiReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ApiReminder | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<{ reminders: ApiReminder[] }>(
      "/reminders?status=active&limit=all",
    );
    setReminders(res.reminders);
    setLoading(false);
  }, []);

  useOnMount(() => {
    void load();
  });

  const groups = groupRemindersByDay(reminders);
  const noteTitle = (id: string) =>
    reminders.find((r) => r.note_id === id)?.note_title || "Untitled";

  const openEdit = (r: ApiReminder) => {
    setEditingReminder(r);
    setDialogOpen(true);
  };

  const deleteReminder = async (id: string) => {
    const ok = await confirm({
      title: "Delete reminder",
      message: "Delete this reminder?",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setLoading(true);
    await apiFetch(`/reminders/${id}`, { method: "DELETE" });
    toast("Reminder deleted");
    await load();
  };

  const completeReminder = async (id: string) => {
    setActingId(id);
    try {
      await apiFetch(`/reminders/${id}/complete`, { method: "POST", body: "{}" });
      toast("Marked complete");
      setLoading(true);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not complete", "error");
    } finally {
      setActingId(null);
    }
  };

  const snoozeReminder = async (id: string, minutes: number) => {
    setActingId(id);
    try {
      await apiFetch(`/reminders/${id}/snooze`, {
        method: "POST",
        body: JSON.stringify({ fire_at: snoozeFireAt(minutes) }),
      });
      toast(`Snoozed ${minutes >= 60 ? `${minutes / 60} hour` : `${minutes} min`}`);
      setLoading(true);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not snooze", "error");
    } finally {
      setActingId(null);
    }
  };

  const renderItem = (r: ApiReminder, index: number, overdue = false) => (
    <div
      key={r.id}
      className={`timeline-item timeline-item-with-actions${overdue ? " timeline-item-overdue" : ""}`}
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="timeline-item-body">
        <Link href={`/notes/${r.note_id}`} className="timeline-item-link">
          <h3>{noteTitle(r.note_id)}</h3>
          <ReminderMeta fireAt={r.fire_at} repeatRule={r.repeat_rule} />
        </Link>
        <div className="timeline-item-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => completeReminder(r.id)}
            disabled={actingId === r.id}
            aria-label="Complete reminder"
          >
            <Check size={16} weight="bold" />
            Done
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => snoozeReminder(r.id, 60)}
            disabled={actingId === r.id}
            aria-label="Snooze 1 hour"
          >
            <Clock size={16} />
            +1h
          </button>
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
          </button>
        </div>
      </div>
    </div>
  );

  const section = (
    title: string,
    items: ApiReminder[],
    offset: number,
    overdue = false,
  ) =>
    items.length > 0 && (
      <div className="timeline-section">
        <p className={`timeline-label${overdue ? " timeline-label-overdue" : ""}`}>
          {title}
        </p>
        {items.map((r, i) => renderItem(r, offset + i, overdue))}
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
          {section("Overdue", groups.overdue, idx, true)}
          {(idx += groups.overdue.length)}
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
