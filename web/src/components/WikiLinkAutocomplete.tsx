"use client";

import { useEffect, useRef, useState } from "react";

type NoteRef = { id: string; title: string };

type Props = {
  notes: NoteRef[];
  query: string;
  position: { top: number; left: number };
  onSelect: (note: NoteRef) => void;
  onClose: () => void;
};

const MAX_RESULTS = 8;

export function WikiLinkAutocomplete({
  notes,
  query,
  position,
  onSelect,
  onClose,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? notes.filter((n) => n.title.toLowerCase().includes(q))
    : notes;
  const results = filtered.slice(0, MAX_RESULTS);

  useEffect(() => {
    const id = window.setTimeout(() => setActiveIndex(0), 0);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
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
  }, [results, activeIndex, onSelect, onClose]);

  if (results.length === 0) return null;

  return (
    <ul
      className="wiki-autocomplete"
      style={{ top: position.top, left: position.left }}
      ref={listRef}
      role="listbox"
    >
      {results.map((note, i) => (
        <li
          key={note.id}
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
