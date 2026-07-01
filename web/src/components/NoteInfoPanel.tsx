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
    <div className="panel panel-pad" style={{ marginBottom: 28 }}>
      <h2 className="settings-heading">
        <Info size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
        Note Info
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginTop: 12 }}>
        <div>
          <span className="settings-muted">Words</span>
          <p style={{ margin: "2px 0 0", fontSize: "1.1rem", fontWeight: 600 }}>{words}</p>
        </div>
        <div>
          <span className="settings-muted">Characters</span>
          <p style={{ margin: "2px 0 0", fontSize: "1.1rem", fontWeight: 600 }}>{chars}</p>
        </div>
        <div>
          <span className="settings-muted">Reading time</span>
          <p style={{ margin: "2px 0 0", fontSize: "1.1rem", fontWeight: 600 }}>{readingTime(words)}</p>
        </div>
        <div>
          <span className="settings-muted">Last edited</span>
          <p style={{ margin: "2px 0 0", fontSize: "1.1rem", fontWeight: 600 }}>{relativeTime(updatedAt)}</p>
        </div>
        <div>
          <span className="settings-muted">Created</span>
          <p style={{ margin: "2px 0 0", fontSize: "0.9rem" }}>{formatDate(createdAt)}</p>
        </div>
        <div>
          <span className="settings-muted">Modified</span>
          <p style={{ margin: "2px 0 0", fontSize: "0.9rem" }}>{formatDate(updatedAt)}</p>
        </div>
      </div>
    </div>
  );
}
