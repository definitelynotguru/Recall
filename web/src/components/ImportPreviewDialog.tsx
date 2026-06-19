"use client";

import { UploadSimple } from "@phosphor-icons/react";
import type { BackupPreview } from "@/lib/backup-import";
import { DialogShell } from "@/components/DialogShell";

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
    <DialogShell
      onClose={onClose}
      title="Import backup"
      subtitle="Merge by id — existing records will be updated"
      footer={
        <>
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
        </>
      }
    >
      {preview.warnings.length > 0 && (
        <div className="hint-banner" style={{ marginBottom: 16 }}>
          <div>
            {preview.warnings.map((warning) => (
              <p key={warning} style={{ margin: "0 0 6px" }}>
                {warning}
              </p>
            ))}
          </div>
        </div>
      )}
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
    </DialogShell>
  );
}
