import * as XLSX from "xlsx";
import type { CellValue, Sheet, Workbook } from "./types";

const MAX_SHEET_NAME = 31;
const MAX_ROWS = 5000;
const MAX_COLS = 100;

function asCell(value: unknown): CellValue {
  if (value == null || value === "") return "";
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}

function normalizeSheet(name: string, aoa: unknown[][]): Sheet {
  const clipped = aoa.slice(0, MAX_ROWS).map((row) => row.slice(0, MAX_COLS));
  const colCount = Math.max(1, ...clipped.map((row) => row.length), 8);
  const rowCount = Math.max(clipped.length, 20);
  const rows: CellValue[][] = [];
  for (let r = 0; r < rowCount; r++) {
    const source = clipped[r] ?? [];
    const row: CellValue[] = [];
    for (let c = 0; c < colCount; c++) {
      row.push(asCell(source[c]));
    }
    rows.push(row);
  }
  return { name: name.slice(0, MAX_SHEET_NAME) || "Sheet", rows };
}

export function parseExcel(buffer: Buffer, projectId: string, fileName: string): Workbook {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const names = wb.SheetNames.length ? wb.SheetNames : ["Sheet1"];
  const sheets = names.map((name) => {
    const sheet = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: true,
    });
    return normalizeSheet(name, aoa);
  });
  return {
    projectId,
    fileName,
    sheets,
    updatedAt: new Date().toISOString(),
  };
}

export function writeExcel(workbook: Workbook): Buffer {
  const wb = XLSX.utils.book_new();
  for (const sheet of workbook.sheets) {
    const ws = XLSX.utils.aoa_to_sheet(
      sheet.rows.map((row) => row.map((cell) => (cell === "" ? undefined : cell))),
    );
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, MAX_SHEET_NAME) || "Sheet");
  }
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

export function padSheet(sheet: Sheet, minRows = 20, minCols = 8): Sheet {
  const colCount = Math.max(minCols, ...sheet.rows.map((row) => row.length), 1);
  const rows = sheet.rows.map((row) => {
    const next = row.slice();
    while (next.length < colCount) next.push("");
    return next;
  });
  while (rows.length < minRows) {
    rows.push(Array.from({ length: colCount }, () => ""));
  }
  return { ...sheet, rows };
}
