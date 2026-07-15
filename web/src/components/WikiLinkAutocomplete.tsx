"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

type NoteRef = { id: string; title: string };

type Props = {
  notes: NoteRef[];
  query: string;
  position: { top: number; left: number };
  editorRef: RefObject<HTMLTextAreaElement | null>;
  listboxId: string;
  onSelect: (note: NoteRef) => void;
  onClose: () => void;
  onActiveDescendantChange: (id: string | null) => void;
};

const MAX_RESULTS = 8;

export function WikiLinkAutocomplete({
  notes,
  query,
  position,
  editorRef,
  listboxId,
  onSelect,
  onClose,
  onActiveDescendantChange,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? notes.filter((note) => note.title.toLowerCase().includes(q))
      : notes;
    return filtered.slice(0, MAX_RESULTS);
  }, [notes, query]);

  useEffect(() => {
    const id = window.setTimeout(() => setActiveIndex(0), 0);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const active = results[activeIndex];
    onActiveDescendantChange(
      active ? `${listboxId}-option-${active.id}` : null,
    );
    return () => onActiveDescendantChange(null);
  }, [activeIndex, listboxId, onActiveDescendantChange, results]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (document.activeElement !== editorRef.current) return;
      if (results.length === 0) {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[activeIndex]) {
          onSelect(results[activeIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [results, activeIndex, editorRef, onSelect, onClose]);

  return (
    <ul
      className="wiki-autocomplete"
      style={{ top: position.top, left: position.left }}
      ref={listRef}
      role="listbox"
      id={listboxId}
    >
      {results.length === 0 && (
        <li
          role="option"
          aria-disabled="true"
          aria-selected="false"
          className="wiki-autocomplete-item"
        >
          No matching notes
        </li>
      )}
      {results.map((note, i) => (
        <li
          key={note.id}
          id={`${listboxId}-option-${note.id}`}
          role="option"
          aria-selected={i === activeIndex}
          className={`wiki-autocomplete-item ${i === activeIndex ? "active" : ""}`}
          onMouseEnter={() => setActiveIndex(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(note);
          }}
        >
          {note.title || "Untitled"}
        </li>
      ))}
    </ul>
  );
}
