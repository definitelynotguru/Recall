"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { apiFetch, getOrCreateDailyNote, type ApiNote } from "@/lib/api-client";

const WEEKDAYS = Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
    new Date(2024, 0, 7 + index),
  ),
);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fmtDate(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseMonth(value: string | null, fallback: Date) {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return { year: fallback.getFullYear(), month: fallback.getMonth() };
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) {
    return { year: fallback.getFullYear(), month: fallback.getMonth() };
  }
  return { year: Number(match[1]), month };
}

export default function CalendarPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <CalendarInner />
      </Suspense>
    </RequireAuth>
  );
}

function CalendarInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [busy, setBusy] = useState(false);

  const today = new Date();
  const { year: viewYear, month: viewMonth } = parseMonth(
    searchParams.get("month"),
    today,
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch<{ notes: ApiNote[] }>("/notes?status=all&limit=all");
        if (!cancelled) setNotes(res.notes);
      } catch {
        // Keep the last successful calendar data on transient failures.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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

  const navigateMonth = (offset: number) => {
    const next = new Date(viewYear, viewMonth + offset, 1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", `${next.getFullYear()}-${pad(next.getMonth() + 1)}`);
    router.push(`/calendar?${params}`, { scroll: false });
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
          {new Intl.DateTimeFormat(undefined, {
            month: "long",
            year: "numeric",
          }).format(new Date(viewYear, viewMonth, 1))}
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigateMonth(-1)} aria-label="Previous month">
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
          <button type="button" className="btn btn-ghost" onClick={() => navigateMonth(1)} aria-label="Next month">
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
          const dateLabel = new Intl.DateTimeFormat(undefined, {
            dateStyle: "full",
          }).format(new Date(viewYear, viewMonth, day));
          return (
            <button
              key={date}
              type="button"
              className={`calendar-cell${isToday ? " today" : ""}${hasNote ? " has-note" : ""}`}
              onClick={() => void openDay(date)}
              disabled={busy}
              aria-label={`${dateLabel}${hasNote ? ", daily note exists" : ", create daily note"}`}
            >
              <span className="calendar-day-num">{day}</span>
              {hasNote && <span className="calendar-dot" aria-hidden="true" />}
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
