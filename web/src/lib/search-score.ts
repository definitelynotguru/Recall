export type SearchableNote = {
  id: string;
  title: string;
  body: string;
  updated_at: string;
  tags?: string[];
};

export type ScoredNote = SearchableNote & {
  score: number;
  snippet: string;
};

const TITLE_WEIGHT = 3;
const TAG_WEIGHT = 2;
const BODY_WEIGHT = 1;
const FUZZY_RATIO = 0.5;
const MAX_FUZZY_DISTANCE = 2;

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function exactMatch(haystack: string, token: string): boolean {
  return haystack.toLowerCase().includes(token);
}

function fuzzyMatchWord(haystackWords: string[], token: string): boolean {
  return haystackWords.some(
    (w) =>
      Math.abs(w.length - token.length) <= MAX_FUZZY_DISTANCE &&
      levenshtein(w, token) <= MAX_FUZZY_DISTANCE,
  );
}

export function scoreNote(note: SearchableNote, query: string): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 0;
  const title = note.title ?? "";
  const body = note.body ?? "";
  const tags = (note.tags ?? []).join(" ");
  const titleWords = words(title);
  const bodyWords = words(body);
  const tagWords = words(tags);

  let score = 0;
  for (const token of tokens) {
    if (exactMatch(title, token)) score += TITLE_WEIGHT;
    else if (fuzzyMatchWord(titleWords, token))
      score += TITLE_WEIGHT * FUZZY_RATIO;

    if (exactMatch(tags, token)) score += TAG_WEIGHT;
    else if (fuzzyMatchWord(tagWords, token)) score += TAG_WEIGHT * FUZZY_RATIO;

    if (exactMatch(body, token)) score += BODY_WEIGHT;
    else if (fuzzyMatchWord(bodyWords, token))
      score += BODY_WEIGHT * FUZZY_RATIO;
  }
  return score;
}

export function makeSnippet(body: string, query: string, radius = 40): string {
  const text = body.replace(/\s+/g, " ").trim();
  if (!text) return "";
  const tokens = tokenize(query);
  const lower = text.toLowerCase();
  let pos = -1;
  for (const token of tokens) {
    const idx = lower.indexOf(token);
    if (idx !== -1 && (pos === -1 || idx < pos)) pos = idx;
  }
  if (pos === -1)
    return (
      text.slice(0, radius * 2).trim() + (text.length > radius * 2 ? "…" : "")
    );
  const start = Math.max(0, pos - radius);
  const end = Math.min(
    text.length,
    pos + tokenLengthAt(text, pos, tokens) + radius,
  );
  return (
    (start > 0 ? "…" : "") +
    text.slice(start, end).trim() +
    (end < text.length ? "…" : "")
  );
}

function tokenLengthAt(text: string, pos: number, tokens: string[]): number {
  const slice = text.slice(pos).toLowerCase();
  let len = 0;
  for (const t of tokens) {
    if (slice.startsWith(t)) len = Math.max(len, t.length);
  }
  return len || 1;
}

export function searchNotes(
  notes: SearchableNote[],
  query: string,
): ScoredNote[] {
  const q = query.trim();
  if (!q) return [];
  const scored = notes
    .map((n) => ({
      ...n,
      score: scoreNote(n, q),
      snippet: makeSnippet(n.body ?? "", q),
    }))
    .filter((n) => n.score > 0);
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
  });
  return scored;
}
