export const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function extractWikiLinks(
  body: string,
): { target: string; display: string }[] {
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
