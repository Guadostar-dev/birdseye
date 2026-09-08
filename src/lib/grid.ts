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
