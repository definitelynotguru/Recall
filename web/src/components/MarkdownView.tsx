"use client";

import {
  CheckCircle,
  Info,
  Lightbulb,
  Note,
  Question,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { renderWikiLinks } from "@/lib/wiki-links";

const CALLOUTS = {
  note: { label: "Note", icon: <Note size={18} weight="fill" /> },
  warning: { label: "Warning", icon: <Warning size={18} weight="fill" /> },
  tip: { label: "Tip", icon: <Lightbulb size={18} weight="fill" /> },
  info: { label: "Info", icon: <Info size={18} weight="fill" /> },
  danger: { label: "Danger", icon: <XCircle size={18} weight="fill" /> },
  success: {
    label: "Success",
    icon: <CheckCircle size={18} weight="fill" />,
  },
  question: { label: "Question", icon: <Question size={18} weight="fill" /> },
} as const;

type CalloutKind = keyof typeof CALLOUTS;

function calloutFrom(children: ReactNode) {
  const blocks = Children.toArray(children);
  const firstIndex = blocks.findIndex((block) => isValidElement(block));
  const first = blocks[firstIndex];
  if (!isValidElement<{ children?: ReactNode }>(first)) return null;
  const inline = Children.toArray(first.props.children);
  if (typeof inline[0] !== "string") return null;
  const match = inline[0].match(
    /^\[!(NOTE|WARNING|TIP|INFO|DANGER|SUCCESS|QUESTION)\](?:[ \t]+([^\n]+))?\n?/i,
  );
  if (!match) return null;

  const kind = match[1].toLowerCase() as CalloutKind;
  const remainingInline = [
    inline[0].slice(match[0].length),
    ...inline.slice(1),
  ];
  const firstBlock = cloneElement(
    first as ReactElement<{ children: ReactNode }>,
    {
      children: remainingInline,
    },
  );
  const hasFirstBlockContent = remainingInline.some(
    (child) => typeof child !== "string" || child.trim().length > 0,
  );
  return {
    kind,
    title: match[2]?.trim() || CALLOUTS[kind].label,
    blocks: [
      ...blocks.slice(0, firstIndex),
      ...(hasFirstBlockContent ? [firstBlock] : []),
      ...blocks.slice(firstIndex + 1),
    ],
  };
}

function Blockquote({ children }: { children?: ReactNode }) {
  const callout = calloutFrom(children);
  if (!callout) return <blockquote>{children}</blockquote>;
  const definition = CALLOUTS[callout.kind];
  return (
    <aside
      className={`markdown-callout markdown-callout-${callout.kind}`}
      aria-label={callout.title}
    >
      <div className="markdown-callout-title">
        {definition.icon}
        <strong>{callout.title}</strong>
      </div>
      <div className="markdown-callout-content">{callout.blocks}</div>
    </aside>
  );
}

export function MarkdownView({
  content,
  noteTitles,
}: {
  content: string;
  noteTitles?: Map<string, string>;
}) {
  const rendered = noteTitles ? renderWikiLinks(content, noteTitles) : content;

  if (!rendered.trim()) {
    return <p className="markdown-empty">No content yet.</p>;
  }
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ blockquote: Blockquote }}
      >
        {rendered}
      </ReactMarkdown>
    </div>
  );
}
