"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { apiFetch, ApiReminder } from "@/lib/api-client";
import { formatFireAt } from "@/lib/reminder-utils";

export default function HistoryPage() {
  const [reminders, setReminders] = useState<ApiReminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ reminders: ApiReminder[] }>(
      "/reminders?status=completed,cancelled&limit=all",
    )
      .then((res) => setReminders(res.reminders))
      .finally(() => setLoading(false));
  }, []);

  return (
    <RequireAuth>
      <header className="page-header">
        <h1>History</h1>
        <p>Completed and cancelled reminders.</p>
      </header>

      {loading ? (
        <>
          <div className="skeleton" />
          <div className="skeleton" />
        </>
      ) : reminders.length === 0 ? (
        <div className="empty-state">
          <p>No completed or cancelled reminders yet.</p>
          <Link href="/today" className="btn btn-primary">
            Open Today
          </Link>
        </div>
      ) : (
        <div className="timeline">
          {reminders.map((r, i) => (
            <Link
              key={r.id}
              href={`/notes/${r.note_id}`}
              className="timeline-item-link timeline-item"
              style={{ "--i": i } as React.CSSProperties}
            >
              <h3>{r.note_title || "Untitled"}</h3>
              <span className="timeline-meta">
                {r.status} · {formatFireAt(r.completed_at ?? r.fire_at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </RequireAuth>
  );
}
