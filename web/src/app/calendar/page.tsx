"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { useOnMount } from "@/hooks/useOnMount";
import { apiFetch, getOrCreateDailyNote, type ApiNote } from "@/lib/api-client";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fmtDate(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default function CalendarPage() {
  return (
    <RequireAuth>
      <CalendarInner />
    </RequireAuth>
  );
}

function CalendarInner() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [busy, setBusy] = useState(false);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useOnMount(() => {
    if (!user) return;
    void (async () => {
      try {
        const res = await apiFetch<{ notes: ApiNote[] }>("/notes?status=all&limit=all");
        setNotes(res.notes);
      } catch {
        setNotes([]);
      }
    })();
  });

  const dailyDates = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) {
      if (n.daily_date) set.add(n.daily_date);
    }
    return set;
  }, [notes]);

  const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate());

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const openDay = useCallback(
    async (date: string) => {
      setBusy(true);
      try {
        const note = await getOrCreateDailyNote(date);
        router.push(`/notes/${note.id}`);
      } catch (e) {
        toast(e instanceof Error ? e.message : "Could not open daily note", "error");
      } finally {
        setBusy(false);
      }
    },
    [router, toast],
  );

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-display)", margin: 0, fontSize: "1.5rem" }}>
          {MONTHS[viewMonth]} {viewYear}
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={prevMonth} aria-label="Previous month">
            <CaretLeft size={20} />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void openDay(todayStr)}
            disabled={busy}
          >
            Today
          </button>
          <button type="button" className="btn btn-ghost" onClick={nextMonth} aria-label="Next month">
            <CaretRight size={20} />
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="calendar-cell empty" />;
          const date = fmtDate(viewYear, viewMonth, day);
          const hasNote = dailyDates.has(date);
          const isToday = date === todayStr;
          return (
            <button
              key={date}
              type="button"
              className={`calendar-cell${isToday ? " today" : ""}${hasNote ? " has-note" : ""}`}
              onClick={() => void openDay(date)}
              disabled={busy}
            >
              <span className="calendar-day-num">{day}</span>
              {hasNote && <span className="calendar-dot" />}
            </button>
          );
        })}
      </div>

      <p style={{ color: "var(--muted)", marginTop: 20, fontSize: "0.85rem" }}>
        Tap any day to open or create a daily note. Days with a dot already have a note.
      </p>
    </div>
  );
}
