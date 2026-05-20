"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { apiFetch, ApiNote, ApiReminder } from "@/lib/api-client";
import {
  groupRemindersByDay,
  formatFireAt,
} from "@/lib/reminder-utils";

export default function TodayPage() {
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [reminders, setReminders] = useState<ApiReminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const groups = groupRemindersByDay(reminders);
  const noteTitle = (id: string) =>
    notes.find((n) => n.id === id)?.title || "Untitled";

  const section = (
    title: string,
    items: ApiReminder[],
    offset: number,
  ) =>
    items.length > 0 && (
      <div className="timeline-section">
        <p className="timeline-label">{title}</p>
        {items.map((r, i) => (
          <Link
            key={r.id}
            href={`/notes/${r.note_id}`}
            className="timeline-item"
            style={{ "--i": offset + i } as React.CSSProperties}
          >
            <h3>{noteTitle(r.note_id)}</h3>
            <span className="timeline-meta">{formatFireAt(r.fire_at)}</span>
            {r.repeat_rule && (
              <span className="chip" style={{ marginTop: 8 }}>
                {r.repeat_rule}
              </span>
            )}
          </Link>
        ))}
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
    </RequireAuth>
  );
}
