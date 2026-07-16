"use client";

import { Info } from "@phosphor-icons/react";

type Props = {
  body: string;
  createdAt: string;
  updatedAt: string;
};

function countWords(text: string): number {
  const stripped = text.replace(/[#*_`>\-\[\]()!]/g, " ").trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).filter(Boolean).length;
}

function readingTime(words: number): string {
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function NoteInfoPanel({ body, createdAt, updatedAt }: Props) {
  const words = countWords(body);
  const chars = body.length;

  return (
    <div className="content-section">
      <h2 className="settings-heading note-info-heading">
        <Info size={18} />
        Note info
      </h2>
      <div className="note-info-grid">
        <div>
          <span className="note-info-label">Words</span>
          <p className="note-info-value">{words}</p>
        </div>
        <div>
          <span className="note-info-label">Characters</span>
          <p className="note-info-value">{chars}</p>
        </div>
        <div>
          <span className="note-info-label">Reading time</span>
          <p className="note-info-value">{readingTime(words)}</p>
        </div>
        <div>
          <span className="note-info-label">Last edited</span>
          <p className="note-info-value">{relativeTime(updatedAt)}</p>
        </div>
        <div>
          <span className="note-info-label">Created</span>
          <p className="note-info-value">{formatDate(createdAt)}</p>
        </div>
        <div>
          <span className="note-info-label">Modified</span>
          <p className="note-info-value">{formatDate(updatedAt)}</p>
        </div>
      </div>
    </div>
  );
}
