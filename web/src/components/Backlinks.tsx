"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { findBacklinks, findUnlinkedMentions } from "@/lib/wiki-links";

type Props = {
  notes: { id: string; title: string; body: string }[];
  currentId: string;
  currentTitle: string;
  onLinkMention: (note: {
    id: string;
    title: string;
    body: string;
  }) => Promise<void>;
};

export function Backlinks({
  notes,
  currentId,
  currentTitle,
  onLinkMention,
}: Props) {
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const backlinks = useMemo(
    () => findBacklinks(notes, currentTitle),
    [notes, currentTitle],
  );
  const unlinked = useMemo(
    () => findUnlinkedMentions(notes, currentId, currentTitle),
    [notes, currentId, currentTitle],
  );

  if (backlinks.length === 0 && unlinked.length === 0) return null;

  return (
    <div className="content-section">
      {backlinks.length > 0 && (
        <>
          <h2 className="settings-heading">Linked from</h2>
          <ul className="backlink-list">
            {backlinks.map((note) => (
              <li key={note.id}>
                <Link href={`/notes/${note.id}`}>
                  {note.title || "Untitled"}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {unlinked.length > 0 && (
        <>
          <h2 className="settings-heading backlink-section-heading">
            Unlinked mentions
          </h2>
          <ul className="backlink-list">
            {unlinked.map((note) => (
              <li key={note.id} className="backlink-row">
                <Link href={`/notes/${note.id}`}>
                  {note.title || "Untitled"}
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={linkingId === note.id}
                  onClick={() => {
                    setLinkingId(note.id);
                    void onLinkMention(note).finally(() => setLinkingId(null));
                  }}
                >
                  {linkingId === note.id ? "Linking…" : "Link mention"}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
