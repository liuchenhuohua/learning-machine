export type DiffLineKind = "context" | "addition" | "deletion" | "meta";

export type DiffLine = {
  kind: DiffLineKind;
  oldNumber: number | null;
  newNumber: number | null;
  content: string;
};

export type DiffHunk = {
  header: string;
  oldStart: number;
  newStart: number;
  lines: DiffLine[];
};

export type ParsedDiff = {
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  raw: string;
};

export type SplitRow = { left: DiffLine | null; right: DiffLine | null };

export function parseUnifiedDiff(raw: string): ParsedDiff {
  const result: ParsedDiff = { hunks: [], additions: 0, deletions: 0, raw };
  let current: DiffHunk | null = null;
  let oldNumber = 0;
  let newNumber = 0;

  for (const line of raw.split(/\r?\n/)) {
    const header = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/);
    if (header) {
      oldNumber = Number(header[1]);
      newNumber = Number(header[2]);
      current = { header: line, oldStart: oldNumber, newStart: newNumber, lines: [] };
      result.hunks.push(current);
      continue;
    }
    if (!current) continue;

    if (line.startsWith("+")) {
      current.lines.push({ kind: "addition", oldNumber: null, newNumber, content: line.slice(1) });
      newNumber += 1;
      result.additions += 1;
    } else if (line.startsWith("-")) {
      current.lines.push({ kind: "deletion", oldNumber, newNumber: null, content: line.slice(1) });
      oldNumber += 1;
      result.deletions += 1;
    } else if (line.startsWith(" ")) {
      current.lines.push({ kind: "context", oldNumber, newNumber, content: line.slice(1) });
      oldNumber += 1;
      newNumber += 1;
    } else if (line.startsWith("\\")) {
      current.lines.push({ kind: "meta", oldNumber: null, newNumber: null, content: line });
    }
  }

  return result;
}

export function buildSplitRows(lines: DiffLine[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.kind === "deletion") {
      const deletions: DiffLine[] = [];
      const additions: DiffLine[] = [];
      while (lines[index]?.kind === "deletion") deletions.push(lines[index++]);
      while (lines[index]?.kind === "addition") additions.push(lines[index++]);
      const length = Math.max(deletions.length, additions.length);
      for (let row = 0; row < length; row += 1) rows.push({ left: deletions[row] ?? null, right: additions[row] ?? null });
      continue;
    }
    if (line.kind === "addition") rows.push({ left: null, right: line });
    else rows.push({ left: line, right: line });
    index += 1;
  }
  return rows;
}
