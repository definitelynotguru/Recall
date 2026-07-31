"use client";

import Link from "next/link";
import { useMemo } from "react";
import { findBacklinks } from "@/lib/wiki-links";

type Props = {
  notes: { id: string; title: string; body: string }[];
  currentTitle: string;
};

export function Backlinks({ notes, currentTitle }: Props) {
  const backlinks = useMemo(
    () => findBacklinks(notes, currentTitle),
    [notes, currentTitle],
  );

  if (backlinks.length === 0) return null;

  return (
    <div className="content-section">
      <h2 className="settings-heading">Linked from</h2>
      <ul className="backlink-list">
        {backlinks.map((note) => (
          <li key={note.id}>
            <Link href={`/notes/${note.id}`}>{note.title || "Untitled"}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
