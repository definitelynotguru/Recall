"use client";

import { useEffect, useState } from "react";
import { ArrowsCounterClockwise, ClockCounterClockwise } from "@phosphor-icons/react";
import { DialogShell } from "@/components/DialogShell";
import { listNoteRevisions, restoreNoteRevision, type ApiNoteRevision } from "@/lib/api-client";

type Props = {
  noteId: string;
  open: boolean;
  onClose: () => void;
  onRestored: (newNoteId: string) => void;
};

export function RevisionHistoryDialog({ noteId, open, onClose, onRestored }: Props) {
  const [revisions, setRevisions] = useState<ApiNoteRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const revs = await listNoteRevisions(noteId);
        if (!cancelled) setRevisions(revs);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, noteId]);

  const restore = async (revision: ApiNoteRevision) => {
    setRestoring(revision.id);
    try {
      const note = await restoreNoteRevision(noteId, revision.id);
      onRestored(note.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoring(null);
    }
  };

  return (
    <DialogShell
      onClose={onClose}
      title="Version history"
      subtitle="Snapshots of earlier edits. Restoring creates a new note copy."
      maxWidth={560}
    >
      {loading && <p className="settings-muted">Loading…</p>}
      {!loading && error && (
        <p className="settings-muted" style={{ color: "var(--danger, #c0392b)" }}>
          {error}
        </p>
      )}
      {!loading && !error && revisions.length === 0 && (
        <p className="settings-muted">No saved revisions yet. Earlier edits will appear here.</p>
      )}
      {!loading && revisions.length > 0 && (
        <ul className="detected-reminder-list" style={{ marginTop: 4 }}>
          {revisions.map((r) => (
            <li key={r.id} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong style={{ fontSize: "0.9rem" }}>
                    <ClockCounterClockwise size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                    {r.title || "Untitled"}
                  </strong>
                  <span className="timeline-meta" style={{ display: "block", marginTop: 4 }}>
                    {new Date(r.created_at).toLocaleString()} · {r.source}
                  </span>
                  <p
                    className="timeline-meta"
                    style={{
                      margin: "6px 0 0",
                      whiteSpace: "pre-wrap",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {r.body || "(empty)"}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                  disabled={restoring === r.id}
                  onClick={() => void restore(r)}
                >
                  <ArrowsCounterClockwise size={14} />
                  {restoring === r.id ? "Restoring…" : "Restore copy"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DialogShell>
  );
}
