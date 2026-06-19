"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { ArchiveBoxIcon, MagnifyingGlass, Plus, PushPin, PushPinSlash } from "@phosphor-icons/react";
import { RequireAuth } from "@/components/RequireAuth";
import { apiFetch, ApiNote, ApiNoteTag, ApiTag } from "@/lib/api-client";

const SEARCH_DEBOUNCE_MS = 300;

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [allTags, setAllTags] = useState<ApiTag[]>([]);
  const [noteTags, setNoteTags] = useState<ApiNoteTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  const loadTags = useCallback(async () => {
    const [tagsRes, noteTagsRes] = await Promise.all([
      apiFetch<{ tags: ApiTag[] }>("/tags"),
      apiFetch<{ note_tags: ApiNoteTag[] }>("/note-tags"),
    ]);
    setAllTags(tagsRes.tags);
    setNoteTags(noteTagsRes.note_tags);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status });
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (tagFilter) params.set("tag_id", tagFilter);
    const res = await apiFetch<{ notes: ApiNote[] }>(`/notes?${params}`);
    setNotes(res.notes);
    setLoading(false);
  }, [debouncedQuery, status, tagFilter]);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const tagsByNote = useMemo(() => {
    const map = new Map<string, ApiTag[]>();
    const tagById = new Map(allTags.map((t) => [t.id, t]));
    for (const link of noteTags) {
      const tag = tagById.get(link.tag_id);
      if (!tag) continue;
      const list = map.get(link.note_id) ?? [];
      list.push(tag);
      map.set(link.note_id, list);
    }
    return map;
  }, [allTags, noteTags]);

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

      {allTags.length > 0 && (
        <div className="tag-picker" style={{ marginBottom: 20 }}>
          <button
            type="button"
            className={`chip tag-chip ${tagFilter === null ? "selected" : ""}`}
            onClick={() => setTagFilter(null)}
          >
            All tags
          </button>
          {allTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={`chip tag-chip ${tagFilter === tag.id ? "selected" : ""}`}
              onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <>
          <div className="skeleton" />
          <div className="skeleton" />
        </>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <p>
            {debouncedQuery || tagFilter
              ? "No matching notes."
              : "Your notebook is empty. Start with a single thought."}
          </p>
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
                {(tagsByNote.get(n.id)?.length ?? 0) > 0 && (
                  <div className="note-row-tags">
                    {tagsByNote.get(n.id)!.map((tag) => (
                      <span key={tag.id} className="chip">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
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
