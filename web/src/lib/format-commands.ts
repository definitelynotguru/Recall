export type EditorState = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export function applyWrap(
  s: EditorState,
  prefix: string,
  suffix: string,
  placeholder: string,
): EditorState {
  const start = s.selectionStart;
  const end = s.selectionEnd;
  const selected = s.value.slice(start, end) || placeholder;
  const next =
    s.value.slice(0, start) + prefix + selected + suffix + s.value.slice(end);
  const selStart = start + prefix.length;
  return {
    value: next,
    selectionStart: selStart,
    selectionEnd: selStart + selected.length,
  };
}

export function applyPrefixLines(s: EditorState, prefix: string): EditorState {
  const start = s.selectionStart;
  const end = s.selectionEnd;
  const lineStart = s.value.lastIndexOf("\n", start - 1) + 1;
  const segment = s.value.slice(lineStart, end);
  const prefixed = segment
    .split("\n")
    .map((line) => (line.startsWith(prefix) ? line : prefix + line))
    .join("\n");
  const next = s.value.slice(0, lineStart) + prefixed + s.value.slice(end);
  return {
    value: next,
    selectionStart: lineStart,
    selectionEnd: lineStart + prefixed.length,
  };
}
