"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Plus } from "@phosphor-icons/react";
import { RequireAuth } from "@/components/RequireAuth";
import { apiFetch, ApiNote } from "@/lib/api-client";

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const res = await apiFetch<{ notes: ApiNote[] }>("/notes");
    setNotes(res.notes);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const createNote = async () => {
    setCreating(true);
    try {
      const res = await apiFetch<{ note: ApiNote }>("/notes", {
        method: "POST",
        body: JSON.stringify({
          id: uuidv4(),
          title: "Untitled",
          body: "",
        }),
      });
      router.push(`/notes/${res.note.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <RequireAuth>
      <header className="page-header">
        <h1>Notes</h1>
        <p>Markdown pages that can sprout reminders on your phone.</p>
      </header>

      <div className="fab-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={createNote}
          disabled={creating}
        >
          <Plus size={18} weight="bold" />
          {creating ? "Creating…" : "New note"}
        </button>
      </div>

      {loading ? (
        <>
          <div className="skeleton" />
          <div className="skeleton" />
        </>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <p>Your notebook is empty. Start with a single thought.</p>
          <button type="button" className="btn btn-primary" onClick={createNote}>
            Write first note
          </button>
        </div>
      ) : (
        <div>
          {notes.map((n, i) => (
            <Link
              key={n.id}
              href={`/notes/${n.id}`}
              className="note-row"
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="note-row-accent" />
              <div className="note-row-body">
                <h3>{n.title || "Untitled"}</h3>
                <p>{n.body.replace(/[#*_`\n]/g, " ").trim() || "Empty page"}</p>
              </div>
              <time className="note-row-time">
                {new Date(n.updated_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </Link>
          ))}
        </div>
      )}
    </RequireAuth>
  );
}
