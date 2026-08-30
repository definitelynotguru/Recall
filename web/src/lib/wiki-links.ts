const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function extractWikiLinks(body: string): { target: string; display: string }[] {
  const links: { target: string; display: string }[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(WIKI_LINK_RE.source, "g");
  while ((match = re.exec(body)) !== null) {
    const target = match[1].trim();
    const display = (match[2] ?? match[1]).trim();
    links.push({ target, display });
  }
  return links;
}

export function findBacklinks(
  allNotes: { id: string; title: string; body: string }[],
  currentTitle: string,
): { id: string; title: string }[] {
  const target = currentTitle.trim().toLowerCase();
  if (!target) return [];
  const result: { id: string; title: string }[] = [];
  for (const note of allNotes) {
    const links = extractWikiLinks(note.body);
    if (links.some((l) => l.target.toLowerCase() === target)) {
      result.push({ id: note.id, title: note.title });
    }
  }
  return result;
}

export function findUnlinkedMentions(
  allNotes: { id: string; title: string; body: string }[],
  currentId: string,
  currentTitle: string,
): { id: string; title: string; body: string }[] {
  const title = currentTitle.trim();
  if (!title) return [];
  return allNotes.filter(
    (note) =>
      note.id !== currentId &&
      findUnlinkedMentionIndex(note.body, title) !== -1,
  );
}

export function linkFirstUnlinkedMention(body: string, title: string): string {
  const target = title.trim();
  if (!target) return body;
  const index = findUnlinkedMentionIndex(body, target);
  if (index === -1) return body;
  const mention = body.slice(index, index + target.length);
  return `${body.slice(0, index)}[[${mention}]]${body.slice(index + target.length)}`;
}

function findUnlinkedMentionIndex(body: string, title: string): number {
  const protectedRanges = [
    ...matchRanges(body, WIKI_LINK_RE),
    ...matchRanges(body, /!?\[[^\]]+\]\([^)]+\)/g),
    ...matchRanges(body, /!?\[[^\]]+\]\[[^\]]*\]/g),
  ];

  const mentions = new RegExp(escapeRegExp(title), "gi");
  let mention: RegExpExecArray | null;
  while ((mention = mentions.exec(body)) !== null) {
    const mentionIndex = mention.index;
    const insideLink = protectedRanges.some(
      (range) => mentionIndex >= range.start && mentionIndex < range.end,
    );
    if (!insideLink) return mentionIndex;
  }
  return -1;
}

function matchRanges(body: string, pattern: RegExp) {
  const ranges: { start: number; end: number }[] = [];
  const matches = new RegExp(pattern.source, "g");
  let match: RegExpExecArray | null;
  while ((match = matches.exec(body)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  return ranges;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildTitleToIdMap(
  notes: { id: string; title: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const note of notes) {
    const key = note.title.trim().toLowerCase();
    if (key && !map.has(key)) {
      map.set(key, note.id);
    }
  }
  return map;
}

export function renderWikiLinks(
  body: string,
  titleToId: Map<string, string>,
): string {
  return body.replace(WIKI_LINK_RE, (fullMatch, targetRaw, displayRaw) => {
    const target = String(targetRaw).trim();
    const display = (displayRaw ?? targetRaw).trim();
    const id = titleToId.get(target.toLowerCase());
    if (id) {
      return `[${display}](/notes/${id})`;
    }
    return fullMatch;
  });
}
