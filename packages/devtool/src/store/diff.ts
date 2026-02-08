import type { DiffLine, LazyDiff, CacheDiff, CacheChange } from "../types";

export function computeDiff(before: unknown, after: unknown): DiffLine[] {
  const beforeLines = jsonToLines(before);
  const afterLines = jsonToLines(after);

  return diffLines(beforeLines, afterLines);
}

function jsonToLines(obj: unknown, indent = 0): string[] {
  if (obj === undefined) return ["undefined"];
  if (obj === null) return ["null"];

  const spaces = "  ".repeat(indent);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return ["[]"];

    const lines = ["["];

    obj.forEach((item, i) => {
      const itemLines = jsonToLines(item, indent + 1);
      const comma = i < obj.length - 1 ? "," : "";
      itemLines[itemLines.length - 1] += comma;
      lines.push(...itemLines.map((l) => spaces + "  " + l));
    });

    lines.push(spaces + "]");
    return lines;
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj);

    if (entries.length === 0) return ["{}"];

    const lines = ["{"];

    entries.forEach(([key, value], i) => {
      const valueLines = jsonToLines(value, indent + 1);
      const comma = i < entries.length - 1 ? "," : "";

      if (valueLines.length === 1) {
        lines.push(`${spaces}  "${key}": ${valueLines[0]}${comma}`);
      } else {
        lines.push(`${spaces}  "${key}": ${valueLines[0]}`);
        valueLines.slice(1, -1).forEach((l) => lines.push(spaces + "  " + l));
        lines.push(spaces + "  " + valueLines[valueLines.length - 1] + comma);
      }
    });

    lines.push(spaces + "}");
    return lines;
  }

  if (typeof obj === "string") return [`"${obj}"`];

  return [String(obj)];
}

function diffLines(before: string[], after: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  const beforeSet = new Set(before);
  const afterSet = new Set(after);

  let bi = 0;
  let ai = 0;

  while (bi < before.length || ai < after.length) {
    const beforeLine = before[bi];
    const afterLine = after[ai];

    if (bi >= before.length && afterLine !== undefined) {
      result.push({ type: "added", content: afterLine });
      ai++;
    } else if (ai >= after.length && beforeLine !== undefined) {
      result.push({ type: "removed", content: beforeLine });
      bi++;
    } else if (beforeLine === afterLine && beforeLine !== undefined) {
      result.push({ type: "unchanged", content: beforeLine });
      bi++;
      ai++;
    } else if (beforeLine !== undefined && !afterSet.has(beforeLine)) {
      result.push({ type: "removed", content: beforeLine });
      bi++;
    } else if (afterLine !== undefined && !beforeSet.has(afterLine)) {
      result.push({ type: "added", content: afterLine });
      ai++;
    } else if (beforeLine !== undefined) {
      result.push({ type: "removed", content: beforeLine });
      bi++;
    }
  }

  return result;
}

export function createLazyDiff(before: unknown, after: unknown): LazyDiff {
  let cached: DiffLine[] | null = null;
  const beforeStr = JSON.stringify(before);
  const afterStr = JSON.stringify(after);

  return {
    hasChanges: beforeStr !== afterStr,

    getDiff(): DiffLine[] {
      if (!cached) {
        cached = computeDiff(before, after);
      }

      return cached;
    },
  };
}

export function createCacheDiff(
  before: Map<string, unknown>,
  after: Map<string, unknown>
): CacheDiff {
  const changes: CacheChange[] = [];

  for (const [key, beforeValue] of before) {
    const afterValue = after.get(key);

    if (!after.has(key)) {
      changes.push({ key, type: "removed", diff: beforeValue });
    } else if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes.push({
        key,
        type: "modified",
        diff: createLazyDiff(beforeValue, afterValue),
      });
    }
  }

  for (const [key, afterValue] of after) {
    if (!before.has(key)) {
      changes.push({ key, type: "added", diff: afterValue });
    }
  }

  return {
    hasChanges: changes.length > 0,
    getChanges: () => changes,
  };
}
