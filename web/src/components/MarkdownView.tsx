"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { renderWikiLinks } from "@/lib/wiki-links";

export function MarkdownView({
  content,
  noteTitles,
}: {
  content: string;
  noteTitles?: Map<string, string>;
}) {
  const rendered = noteTitles ? renderWikiLinks(content, noteTitles) : content;

  if (!rendered.trim()) {
    return <p style={{ color: "var(--muted)" }}>No content yet.</p>;
  }
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{rendered}</ReactMarkdown>
    </div>
  );
}
