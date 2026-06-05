"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { ArchiveBoxIcon, MagnifyingGlass, Plus, PushPin, PushPinSlash } from "@phosphor-icons/react";
import { RequireAuth } from "@/components/RequireAuth";
import { apiFetch, ApiNote } from "@/lib/api-client";

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");

  const load = async () => {
    const params = new URLSearchParams({ status });
    if (query.trim()) params.set("q", query.trim());
    const res = await apiFetch<{ notes: ApiNote[] }>(`/notes?${params}`);
    setNotes(res.notes);
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [status, query]);

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

  const patchNote = async (id: string, patch: Record<string, unknown>) => {
    await apiFetch(`/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    await load();
  };

  return (
    <RequireAuth>
      <header className="page-header">
        <h1>Notes</h1>
        <p>Markdown pages that can sprout reminders on your phone.</p>
      </header>

      <div className="fab-row">
        <div className="field notes-search-field">
          <label htmlFor="notes-search">Search</label>
          <div className="input-with-icon">
            <MagnifyingGlass size={18} />
            <input
              id="notes-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title or body"
            />
          </div>
        </div>
        <div className="segmented">
          <button
            type="button"
            className={status === "active" ? "active" : ""}
            onClick={() => setStatus("active")}
          >
            Active
          </button>
          <button
            type="button"
            className={status === "archived" ? "active" : ""}
            onClick={() => setStatus("archived")}
          >
            Archived
          </button>
        </div>
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
          <p>{query ? "No matching notes." : "Your notebook is empty. Start with a single thought."}</p>
          <button type="button" className="btn btn-primary" onClick={createNote}>
            Write first note
          </button>
        </div>
      ) : (
        <div>
          {notes.map((n, i) => (
            <div
              key={n.id}
              className="note-row"
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="note-row-accent" />
              <Link href={`/notes/${n.id}`} className="note-row-body">
                <h3>{n.title || "Untitled"}</h3>
                <p>{n.body.replace(/[#*_`\n]/g, " ").trim() || "Empty page"}</p>
              </Link>
              <time className="note-row-time">
                {new Date(n.updated_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </time>
              <div className="note-row-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    patchNote(n.id, {
                      pinned_at: n.pinned_at ? null : new Date().toISOString(),
                    })
                  }
                  aria-label={n.pinned_at ? "Unpin note" : "Pin note"}
                >
                  {n.pinned_at ? <PushPinSlash size={16} /> : <PushPin size={16} />}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    patchNote(n.id, {
                      status: n.status === "archived" ? "active" : "archived",
                    })
                  }
                  aria-label={n.status === "archived" ? "Unarchive note" : "Archive note"}
                >
                  <ArchiveBoxIcon size={16} />
                  {n.status === "archived" ? "Unarchive" : "Archive"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </RequireAuth>
  );
}
