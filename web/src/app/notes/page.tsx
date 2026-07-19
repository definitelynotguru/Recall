"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArchiveBoxIcon, CalendarDots, MagnifyingGlass, Plus, PushPin, PushPinSlash } from "@phosphor-icons/react";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadError } from "@/components/LoadError";
import { LocalOnlyBanner } from "@/components/LocalOnlyBanner";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { useAsyncLoad } from "@/hooks/useAsyncLoad";
import { apiFetch, ApiNote, ApiNoteTag, ApiTag } from "@/lib/api-client";
import { listTemplates, getOrCreateDailyNote } from "@/lib/api-client";
import { expandTemplate } from "@/lib/templates";
import { makeSnippet, tokenize } from "@/lib/search-score";
import { searchNotes } from "@/lib/search-score";
import { toLocalDateString } from "@/lib/local-date";
import {
  createLocalNote,
  getLocalNote,
  getLocalNotes,
  putLocalNote,
} from "@/lib/local-notes";

const SEARCH_DEBOUNCE_MS = 300;

function HighlightedSnippet({ body, query }: { body: string; query: string }) {
  const snippet = makeSnippet(body, query);
  const terms = Array.from(new Set(tokenize(query)));
  if (terms.length === 0) return <>{snippet}</>;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "ig");
  const parts = snippet.split(re);
  return (
    <>
      {parts.map((part, i) =>
        terms.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i}>{part}</mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={null}>
      <NotesContent />
    </Suspense>
  );
}

function NotesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const isLocal = !user;
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [allTags, setAllTags] = useState<ApiTag[]>([]);
  const [noteTags, setNoteTags] = useState<ApiNoteTag[]>([]);
  const [creating, setCreating] = useState(false);
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery.trim());
  const status =
    searchParams.get("status") === "archived" ? "archived" : "active";
  const tagParam = searchParams.get("tag");
  const tagFilter =
    tagParam &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
      tagParam,
    )
      ? tagParam
      : null;
  const [templates, setTemplates] = useState<ApiNote[]>([]);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [templateMenuMounted, setTemplateMenuMounted] = useState(false);
  const templateMenuRef = useRef<HTMLDivElement>(null);
  const templateTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const value = query.trim();
      setDebouncedQuery(value);
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("q", value);
      else params.delete("q");
      const next = params.toString();
      if (next !== searchParams.toString()) {
        router.replace(next ? `/notes?${next}` : "/notes", { scroll: false });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query, router, searchParams]);

  useEffect(() => {
    if (showTemplateMenu) {
      setTemplateMenuMounted(true);
      return;
    }
    if (!templateMenuMounted) return;
    const id = window.setTimeout(() => setTemplateMenuMounted(false), 180);
    return () => window.clearTimeout(id);
  }, [showTemplateMenu, templateMenuMounted]);

  useEffect(() => {
    if (!showTemplateMenu) return;
    templateMenuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
      ?.focus();

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !templateMenuRef.current?.contains(event.target)
      ) {
        setShowTemplateMenu(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [showTemplateMenu]);

  const updateFilter = (name: "status" | "tag", value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    const next = params.toString();
    router.push(next ? `/notes?${next}` : "/notes", { scroll: false });
  };

  const handleTemplateMenuKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]',
      ),
    );
    const current =
      document.activeElement instanceof HTMLButtonElement
        ? items.indexOf(document.activeElement)
        : -1;
    let next = current;
    if (event.key === "ArrowDown") next = (current + 1) % items.length;
    else if (event.key === "ArrowUp") {
      next = (current - 1 + items.length) % items.length;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      setShowTemplateMenu(false);
      templateTriggerRef.current?.focus();
      return;
    } else {
      return;
    }
    event.preventDefault();
    items[next]?.focus();
  };

  const loadNotes = useCallback(async () => {
    if (!user) {
      const localNotes = await getLocalNotes();
      let filtered = localNotes.filter((n) => n.status === status);
      if (debouncedQuery) {
        const ranked = searchNotes(
          filtered.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            updated_at: n.updated_at,
          })),
          debouncedQuery,
        );
        const rankedIds = new Set(ranked.map((r) => r.id));
        filtered = ranked
          .map((r) => filtered.find((n) => n.id === r.id)!)
          .filter((n) => rankedIds.has(n.id));
      }
      setNotes(filtered);
      return;
    }
    const params = new URLSearchParams({ status });
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (tagFilter) params.set("tag_id", tagFilter);
    const res = await apiFetch<{ notes: ApiNote[] }>(`/notes?${params}`);
    setNotes(res.notes);
  }, [user, debouncedQuery, status, tagFilter]);

  const { loading, error, reload } = useAsyncLoad(loadNotes, [
    user,
    debouncedQuery,
    status,
    tagFilter,
  ]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (isLocal) {
        setAllTags([]);
        setNoteTags([]);
        setTemplates([]);
        return;
      }
      void Promise.allSettled([
        apiFetch<{ tags: ApiTag[] }>("/tags"),
        apiFetch<{ note_tags: ApiNoteTag[] }>("/note-tags"),
        listTemplates(),
      ]).then(([tagsResult, noteTagsResult, templatesResult]) => {
        if (cancelled) return;
        if (tagsResult.status === "fulfilled") {
          setAllTags(tagsResult.value.tags);
        }
        if (noteTagsResult.status === "fulfilled") {
          setNoteTags(noteTagsResult.value.note_tags);
        }
        if (templatesResult.status === "fulfilled") {
          setTemplates(templatesResult.value);
        }
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isLocal]);

  useEffect(() => {
    const handler = () => void reload();
    window.addEventListener("recall:notes-changed", handler);
    return () => window.removeEventListener("recall:notes-changed", handler);
  }, [reload]);

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

  const listRef = useRef<HTMLDivElement>(null);
  // useVirtualizer returns unmemoizable functions; React Compiler skips it (compiler not enabled here).
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 92,
    overscan: 6,
    gap: 0,
  });

  const createNote = async () => {
    setCreating(true);
    try {
      if (!user) {
        const note = createLocalNote();
        note.title = "Untitled";
        await putLocalNote(note);
        router.push(`/notes/${note.id}`);
        return;
      }
      const res = await apiFetch<{ note: ApiNote }>("/notes", {
        method: "POST",
        body: JSON.stringify({
          id: crypto.randomUUID(),
          title: "Untitled",
          body: "",
        }),
      });
      router.push(`/notes/${res.note.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not create note", "error", {
        label: "Retry",
        onClick: () => {
          void createNote();
        },
      });
    } finally {
      setCreating(false);
    }
  };

  const openToday = async () => {
    setCreating(true);
    try {
      const date = toLocalDateString();
      if (!user) {
        const note = createLocalNote();
        note.title = `Daily — ${date}`;
        note.body = "";
        await putLocalNote(note);
        router.push(`/notes/${note.id}`);
        return;
      }
      const note = await getOrCreateDailyNote(date);
      router.push(`/notes/${note.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not open today's note", "error");
    } finally {
      setCreating(false);
    }
  };

  const createFromTemplate = async (tpl: ApiNote) => {
    setShowTemplateMenu(false);
    setCreating(true);
    try {
      const body = expandTemplate(tpl.body, { now: new Date() });
      const res = await apiFetch<{ note: ApiNote }>("/notes", {
        method: "POST",
        body: JSON.stringify({
          id: crypto.randomUUID(),
          title: tpl.title || "Untitled",
          body,
        }),
      });
      router.push(`/notes/${res.note.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not create note", "error");
    } finally {
      setCreating(false);
    }
  };

  const patchNote = async (id: string, patch: Record<string, unknown>) => {
    try {
      if (!user) {
        const existing = await getLocalNote(id);
        if (!existing) return;
        const updated: ApiNote = {
          ...existing,
          ...patch,
          updated_at: new Date().toISOString(),
        } as ApiNote;
        await putLocalNote(updated);
        await reload();
        return;
      }
      await apiFetch(`/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", "error", {
        label: "Retry",
        onClick: () => {
          void patchNote(id, patch);
        },
      });
    }
  };

  return (
    <RequireAuth allowLocal>
      {isLocal && <LocalOnlyBanner />}

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
            onClick={() => updateFilter("status", null)}
            aria-pressed={status === "active"}
          >
            Active
          </button>
          <button
            type="button"
            className={status === "archived" ? "active" : ""}
            onClick={() => updateFilter("status", "archived")}
            aria-pressed={status === "archived"}
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
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void openToday()}
          disabled={creating}
        >
          <CalendarDots size={18} weight="bold" />
          Today
        </button>
        {!isLocal && templates.length > 0 && (
          <div className="template-menu-wrap" ref={templateMenuRef}>
            <button
              ref={templateTriggerRef}
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowTemplateMenu((v) => !v)}
              disabled={creating}
              aria-haspopup="menu"
              aria-expanded={showTemplateMenu}
              aria-controls="template-menu"
            >
              <Plus size={18} weight="bold" />
              From template
            </button>
            {(showTemplateMenu || templateMenuMounted) && (
              <div
                id="template-menu"
                className="template-menu"
                data-state={showTemplateMenu ? "open" : "closed"}
                role="menu"
                aria-hidden={!showTemplateMenu}
                inert={!showTemplateMenu}
                onKeyDown={handleTemplateMenuKeyDown}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setShowTemplateMenu(false);
                  }
                }}
              >
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    role="menuitem"
                    className="template-menu-item"
                    onClick={() => void createFromTemplate(tpl)}
                  >
                    {tpl.title || "Untitled template"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!isLocal && allTags.length > 0 && (
        <div className="tag-picker filter-tags">
          <button
            type="button"
            className={`chip tag-chip ${tagFilter === null ? "selected" : ""}`}
            onClick={() => updateFilter("tag", null)}
            aria-pressed={tagFilter === null}
          >
            All tags
          </button>
          {allTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={`chip tag-chip ${tagFilter === tag.id ? "selected" : ""}`}
              onClick={() =>
                updateFilter("tag", tagFilter === tag.id ? null : tag.id)
              }
              aria-pressed={tagFilter === tag.id}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <LoadError message={error} onRetry={() => void reload()} />
      ) : loading ? (
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
        <div className="notes-scroll" ref={listRef}>
          <div
            className="notes-scroll-spacer"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const n = notes[virtualItem.index];
              const titleId = `note-title-${n.id}`;
              return (
                <div
                  key={n.id}
                  ref={virtualizer.measureElement}
                  data-index={virtualItem.index}
                  className="note-row"
                  style={
                    {
                      position: "absolute",
                      top: virtualItem.start,
                      left: 0,
                      width: "100%",
                    } as React.CSSProperties
                  }
                >
                  <div className="note-row-accent" />
                  <Link
                    href={`/notes/${n.id}`}
                    className="note-row-body"
                    aria-labelledby={titleId}
                  >
                    <h3 id={titleId}>{n.title || "Untitled"}</h3>
                    {debouncedQuery ? (
                      <p>
                        <HighlightedSnippet body={n.body} query={debouncedQuery} />
                      </p>
                    ) : (
                      <p>{n.body.replace(/[#*_`\n]/g, " ").trim() || "Empty page"}</p>
                    )}
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
                  <time className="note-row-time" dateTime={n.updated_at}>
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
                      aria-pressed={Boolean(n.pinned_at)}
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
              );
            })}
          </div>
        </div>
      )}
    </RequireAuth>
  );
}
