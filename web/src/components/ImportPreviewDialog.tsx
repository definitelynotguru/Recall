"use client";

import { UploadSimple, X } from "@phosphor-icons/react";
import type { BackupPreview } from "@/lib/backup-import";

type Props = {
  open: boolean;
  preview: BackupPreview | null;
  importing: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ImportPreviewDialog({
  open,
  preview,
  importing,
  onClose,
  onConfirm,
}: Props) {
  if (!open || !preview) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-sheet panel panel-pad"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                margin: "0 0 6px",
                fontSize: "1.25rem",
                letterSpacing: "-0.02em",
              }}
            >
              Import backup
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--parchment-muted)" }}>
              Merge by id — existing records will be updated
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <ul className="import-preview-list">
          <li>
            <strong>{preview.notes}</strong> notes
            {preview.newNotes > 0 && (
              <span className="timeline-meta"> · {preview.newNotes} new</span>
            )}
          </li>
          <li>
            <strong>{preview.reminders}</strong> reminders
          </li>
          <li>
            <strong>{preview.tags}</strong> tags
          </li>
          <li>
            <strong>{preview.note_tags}</strong> tag links
          </li>
        </ul>

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={importing}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={importing}
          >
            <UploadSimple size={18} />
            {importing ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
