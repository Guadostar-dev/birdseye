export function colLabel(index: number): string {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

export function parseClipboard(text: string): string[][] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line, i, all) => !(i === all.length - 1 && line === ""))
    .map((line) => line.split("\t"));
}

export function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

export const DEFAULT_COL_WIDTH = 120;
export const MIN_COL_WIDTH = 64;
export const MAX_COL_WIDTH = 560;

export function clampColWidth(width: number): number {
  return Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, Math.round(width)));
}

export function sanitizeFill(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const hex = value.trim();
  if (/^#([0-9a-fA-F]{3}){1,2}$/.test(hex)) return hex.toUpperCase();
  return undefined;
}

export function fillTextColor(hex: string): string {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((ch) => ch + ch).join("") : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 150 ? "#FFFFFF" : "#1A2B4A";
}

export function rangeBounds(a: { row: number; col: number }, b: { row: number; col: number }) {
  return {
    rowStart: Math.min(a.row, b.row),
    rowEnd: Math.max(a.row, b.row),
    colStart: Math.min(a.col, b.col),
    colEnd: Math.max(a.col, b.col),
  };
}
