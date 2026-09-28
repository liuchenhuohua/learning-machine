export function buildProjectUnifiedDiff(before: string, after: string, path = "project.md"): string {
  if (before === after) return "";
  const oldLines = splitLines(before);
  const newLines = splitLines(after);
  const matrix = buildLcsMatrix(oldLines, newLines);
  const body: string[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex < oldLines.length && newIndex < newLines.length && oldLines[oldIndex] === newLines[newIndex]) {
      body.push(` ${oldLines[oldIndex]}`);
      oldIndex += 1;
      newIndex += 1;
    } else if (oldIndex < oldLines.length && (newIndex >= newLines.length || matrix[oldIndex + 1][newIndex] >= matrix[oldIndex][newIndex + 1])) {
      body.push(`-${oldLines[oldIndex]}`);
      oldIndex += 1;
    } else {
      body.push(`+${newLines[newIndex]}`);
      newIndex += 1;
    }
  }

  const oldStart = oldLines.length === 0 ? 0 : 1;
  const newStart = newLines.length === 0 ? 0 : 1;
  return `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -${oldStart},${oldLines.length} +${newStart},${newLines.length} @@\n${body.join("\n")}`;
}

function splitLines(value: string) {
  return value === "" ? [] : value.replace(/\r\n/g, "\n").split("\n");
}

function buildLcsMatrix(left: string[], right: string[]) {
  const matrix = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));
  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      matrix[leftIndex][rightIndex] = left[leftIndex] === right[rightIndex]
        ? matrix[leftIndex + 1][rightIndex + 1] + 1
        : Math.max(matrix[leftIndex + 1][rightIndex], matrix[leftIndex][rightIndex + 1]);
    }
  }
  return matrix;
}
