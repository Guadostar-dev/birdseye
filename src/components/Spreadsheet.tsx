"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CellValue, Sheet, Workbook } from "@/lib/types";
import {
  DEFAULT_COL_WIDTH,
  cellKey,
  clampColWidth,
  colLabel,
  fillTextColor,
  parseClipboard,
  rangeBounds,
  sanitizeFill,
} from "@/lib/grid";

type Props = {
  workbook: Workbook;
  onWorkbookChange: (workbook: Workbook) => void;
  saveState: "saved" | "saving" | "unsaved" | "error";
  uploadUrl: string;
  downloadUrl: string;
};

type Coord = { row: number; col: number };

const FILL_PRESETS = [
  { label: "Clear", value: "" },
  { label: "White", value: "#FFFFFF" },
  { label: "Frost", value: "#F3F6FB" },
  { label: "Gold", value: "#F6E3A1" },
  { label: "Green", value: "#DCEFCE" },
  { label: "Amber", value: "#FBF3E0" },
  { label: "Red", value: "#F8D4D8" },
  { label: "Blue", value: "#D7E4F8" },
  { label: "Navy", value: "#1A2B4A" },
  { label: "Birds Eye red", value: "#CC2131" },
];

function cloneSheets(sheets: Sheet[]): Sheet[] {
  return sheets.map((sheet) => ({
    name: sheet.name,
    rows: sheet.rows.map((row) => row.slice()),
    columnWidths: sheet.columnWidths?.slice(),
    fills: sheet.fills ? { ...sheet.fills } : {},
  }));
}

function ensureSize(sheet: Sheet, rows: number, cols: number): Sheet {
  const nextRows = sheet.rows.map((row) => {
    const copy = row.slice();
    while (copy.length < cols) copy.push("");
    return copy;
  });
  while (nextRows.length < rows) {
    nextRows.push(Array.from({ length: cols }, () => ""));
  }
  const columnWidths = Array.from({ length: cols }, (_, index) =>
    clampColWidth(sheet.columnWidths?.[index] ?? DEFAULT_COL_WIDTH),
  );
  return { ...sheet, rows: nextRows, columnWidths, fills: { ...(sheet.fills || {}) } };
}

function display(value: CellValue): string {
  if (value == null) return "";
  return String(value);
}

export function Spreadsheet({ workbook, onWorkbookChange, saveState, uploadUrl, downloadUrl }: Props) {
  const [activeSheet, setActiveSheet] = useState(0);
  const [selected, setSelected] = useState<Coord>({ row: 0, col: 0 });
  const [anchor, setAnchor] = useState<Coord>({ row: 0, col: 0 });
  const [editing, setEditing] = useState<Coord | null>(null);
  const [draft, setDraft] = useState("");
  const [renameIndex, setRenameIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pointerSelecting, setPointerSelecting] = useState(false);
  const [liveWidths, setLiveWidths] = useState<number[] | null>(null);
  const resizeRef = useRef<{ col: number; startX: number; startWidth: number } | null>(null);
  const liveWidthsRef = useRef<number[] | null>(null);
  const columnWidthsRef = useRef<number[]>([]);
  const updateSheetRef = useRef<(mutator: (current: Sheet) => Sheet) => void>(() => undefined);

  const sheet = workbook.sheets[activeSheet] ?? workbook.sheets[0];
  const rowCount = sheet?.rows.length ?? 0;
  const colCount = sheet?.rows[0]?.length ?? 0;
  const fills = sheet?.fills || {};
  const columnWidths = useMemo(
    () =>
      Array.from({ length: colCount }, (_, index) =>
        clampColWidth(liveWidths?.[index] ?? sheet?.columnWidths?.[index] ?? DEFAULT_COL_WIDTH),
      ),
    [colCount, liveWidths, sheet?.columnWidths],
  );

  useEffect(() => {
    if (activeSheet >= workbook.sheets.length) setActiveSheet(0);
  }, [activeSheet, workbook.sheets.length]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const updateSheet = useCallback(
    (mutator: (current: Sheet) => Sheet) => {
      const sheets = cloneSheets(workbook.sheets);
      const index = Math.min(activeSheet, sheets.length - 1);
      sheets[index] = mutator(sheets[index]);
      onWorkbookChange({ ...workbook, sheets, updatedAt: new Date().toISOString() });
    },
    [activeSheet, onWorkbookChange, workbook],
  );

  columnWidthsRef.current = columnWidths;
  updateSheetRef.current = updateSheet;

  useEffect(() => {
    function onMove(event: MouseEvent) {
      const resize = resizeRef.current;
      if (!resize) return;
      const base = liveWidthsRef.current ?? columnWidthsRef.current;
      const next = base.slice();
      next[resize.col] = clampColWidth(resize.startWidth + (event.clientX - resize.startX));
      liveWidthsRef.current = next;
      setLiveWidths(next);
    }
    function onUp() {
      setPointerSelecting(false);
      const resize = resizeRef.current;
      if (!resize) return;
      const widths = liveWidthsRef.current;
      resizeRef.current = null;
      liveWidthsRef.current = null;
      document.body.classList.remove("sheet-resizing");
      setLiveWidths(null);
      if (widths) {
        updateSheetRef.current((item) => {
          const sized = ensureSize(item, item.rows.length, Math.max(item.rows[0]?.length ?? 0, widths.length));
          return { ...sized, columnWidths: widths };
        });
      }
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const bounds = rangeBounds(anchor, selected);

  const commitEdit = useCallback(() => {
    if (!editing) return;
    updateSheet((current) => {
      const sized = ensureSize(current, editing.row + 1, editing.col + 1);
      const rows = sized.rows.map((row) => row.slice());
      const numeric = draft.trim() !== "" && Number.isFinite(Number(draft)) && !/^0\d/.test(draft.trim());
      rows[editing.row][editing.col] = numeric ? Number(draft) : draft;
      return { ...sized, rows };
    });
    setEditing(null);
  }, [draft, editing, updateSheet]);

  const startEdit = useCallback(
    (coord: Coord, seed?: string) => {
      const value = seed ?? display(sheet.rows[coord.row]?.[coord.col] ?? "");
      setSelected(coord);
      setAnchor(coord);
      setEditing(coord);
      setDraft(value);
    },
    [sheet],
  );

  const moveSelection = useCallback(
    (rowDelta: number, colDelta: number, extend = false) => {
      setSelected((prev) => {
        const next = {
          row: Math.max(0, Math.min(rowCount - 1, prev.row + rowDelta)),
          col: Math.max(0, Math.min(colCount - 1, prev.col + colDelta)),
        };
        if (!extend) setAnchor(next);
        return next;
      });
    },
    [colCount, rowCount],
  );

  function addRow() {
    updateSheet((current) => {
      const cols = Math.max(1, ...current.rows.map((r) => r.length));
      const sized = ensureSize(current, current.rows.length + 1, cols);
      sized.rows[sized.rows.length - 1] = Array.from({ length: cols }, () => "");
      return sized;
    });
  }

  function addColumn() {
    updateSheet((current) => {
      const sized = ensureSize(current, current.rows.length, (current.rows[0]?.length ?? 0) + 1);
      return sized;
    });
  }

  function applyFill(color: string) {
    const hex = sanitizeFill(color);
    updateSheet((current) => {
      const nextFills = { ...(current.fills || {}) };
      for (let row = bounds.rowStart; row <= bounds.rowEnd; row++) {
        for (let col = bounds.colStart; col <= bounds.colEnd; col++) {
          const key = cellKey(row, col);
          if (hex) nextFills[key] = hex;
          else delete nextFills[key];
        }
      }
      return { ...current, fills: nextFills };
    });
  }

  function addSheet() {
    const sheets = cloneSheets(workbook.sheets);
    const cols = 8;
    sheets.push({
      name: `Sheet${sheets.length + 1}`,
      rows: Array.from({ length: 20 }, () => Array.from({ length: cols }, () => "")),
      columnWidths: Array.from({ length: cols }, () => DEFAULT_COL_WIDTH),
      fills: {},
    });
    onWorkbookChange({ ...workbook, sheets, updatedAt: new Date().toISOString() });
    setActiveSheet(sheets.length - 1);
  }

  function deleteSheet(index: number) {
    if (workbook.sheets.length === 1) return;
    const sheets = workbook.sheets.filter((_, i) => i !== index);
    onWorkbookChange({ ...workbook, sheets, updatedAt: new Date().toISOString() });
    setActiveSheet(Math.max(0, index - 1));
  }

  async function uploadFile(file: File) {
    setUploadError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(uploadUrl, { method: "POST", body: form });
      const data = (await response.json()) as { error?: string; workbook?: Workbook };
      if (!response.ok || !data.workbook) {
        setUploadError(data.error || "Upload failed.");
        return;
      }
      onWorkbookChange(data.workbook);
      setActiveSheet(0);
    } catch {
      setUploadError("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    if (editing) return;
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;
    event.preventDefault();
    const block = parseClipboard(text);
    updateSheet((current) => {
      const neededRows = selected.row + block.length;
      const neededCols = selected.col + Math.max(...block.map((r) => r.length));
      const sized = ensureSize(current, neededRows, neededCols);
      const rows = sized.rows.map((row) => row.slice());
      block.forEach((line, r) => {
        line.forEach((value, c) => {
          rows[selected.row + r][selected.col + c] = value;
        });
      });
      return { ...sized, rows };
    });
  }

  async function onCopy(event: React.ClipboardEvent<HTMLDivElement>) {
    if (editing) return;
    const value = display(sheet.rows[selected.row]?.[selected.col] ?? "");
    event.clipboardData.setData("text/plain", value);
    event.preventDefault();
  }

  function onGridKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (editing) {
      if (event.key === "Enter") {
        event.preventDefault();
        commitEdit();
        moveSelection(1, 0);
      } else if (event.key === "Tab") {
        event.preventDefault();
        commitEdit();
        moveSelection(0, event.shiftKey ? -1 : 1);
      } else if (event.key === "Escape") {
        setEditing(null);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1, 0, event.shiftKey);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1, 0, event.shiftKey);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelection(0, -1, event.shiftKey);
    } else if (event.key === "ArrowRight" || event.key === "Tab") {
      event.preventDefault();
      moveSelection(0, event.shiftKey ? -1 : 1, event.shiftKey || event.key === "Tab" ? event.shiftKey : false);
    } else if (event.key === "Enter") {
      event.preventDefault();
      startEdit(selected);
    } else if (event.key === "F2") {
      event.preventDefault();
      startEdit(selected);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      updateSheet((current) => {
        const rows = current.rows.map((row) => row.slice());
        for (let row = bounds.rowStart; row <= bounds.rowEnd; row++) {
          for (let col = bounds.colStart; col <= bounds.colEnd; col++) {
            if (rows[row]) rows[row][col] = "";
          }
        }
        return { ...current, rows };
      });
    } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      startEdit(selected, event.key);
    }
  }

  const formulaLabel = useMemo(() => {
    const start = `${colLabel(bounds.colStart)}${bounds.rowStart + 1}`;
    const end = `${colLabel(bounds.colEnd)}${bounds.rowEnd + 1}`;
    return start === end ? start : `${start}:${end}`;
  }, [bounds]);

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "unsaved"
        ? "Editing"
        : saveState === "error"
          ? "Save failed"
          : "Saved";

  const tableWidth = 48 + columnWidths.reduce((sum, width) => sum + width, 0);
  const selectedFill = fills[cellKey(selected.row, selected.col)] || "#FFFFFF";

  function selectCell(coord: Coord, extend: boolean) {
    setSelected(coord);
    if (!extend) setAnchor(coord);
  }

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-be-ice bg-white shadow-sm"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) void uploadFile(file);
      }}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-be-ice px-3 py-2">
        <div className="flex min-w-[12rem] flex-1 items-center gap-2 rounded-lg border border-be-ice bg-be-frost px-3 py-2">
          <span className="text-xs font-bold text-be-blue">{formulaLabel}</span>
          <input
            aria-label="Cell value"
            className="w-full bg-transparent text-sm text-be-navy outline-none"
            value={editing ? draft : display(sheet.rows[selected.row]?.[selected.col] ?? "")}
            onChange={(e) => {
              if (!editing) startEdit(selected, e.target.value);
              else setDraft(e.target.value);
            }}
            onFocus={() => {
              if (!editing) startEdit(selected);
            }}
            onBlur={commitEdit}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={addRow} className="rounded-lg border border-be-ice px-3 py-2 text-xs font-semibold hover:bg-be-frost">
            Add row
          </button>
          <button type="button" onClick={addColumn} className="rounded-lg border border-be-ice px-3 py-2 text-xs font-semibold hover:bg-be-frost">
            Add column
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg bg-be-navy px-3 py-2 text-xs font-semibold text-white hover:bg-be-blue"
          >
            {uploading ? "Uploading…" : "Upload Excel"}
          </button>
          <a
            href={downloadUrl}
            className="rounded-lg bg-be-red px-3 py-2 text-xs font-semibold text-white hover:bg-be-red-deep"
          >
            Download .xlsx
          </a>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              saveState === "error" ? "bg-be-red/10 text-be-red" : "bg-be-frost text-be-navy/70"
            }`}
          >
            {saveLabel}
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-be-ice bg-be-frost/70 px-3 py-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-be-navy/60">Fill</span>
        {FILL_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            title={preset.label}
            onClick={() => applyFill(preset.value)}
            className={`h-6 w-6 rounded-md border ${
              preset.value === "" ? "bg-[linear-gradient(135deg,#fff_46%,#cc2131_46%,#cc2131_54%,#fff_54%)]" : ""
            } ${selectedFill.toUpperCase() === preset.value ? "ring-2 ring-be-navy" : "border-black/10"}`}
            style={preset.value ? { background: preset.value } : undefined}
          />
        ))}
        <label className="flex items-center gap-1 text-[11px] font-semibold text-be-navy/70" title="Custom fill colour">
          Custom
          <input
            type="color"
            value={selectedFill}
            onChange={(event) => applyFill(event.target.value)}
            className="h-6 w-8 cursor-pointer rounded border border-be-mist bg-white"
          />
        </label>
        <span className="text-[11px] text-be-navy/50">Select cells, then pick a colour. Drag a column edge to resize.</span>
      </div>
      {uploadError ? <p className="shrink-0 px-3 py-2 text-sm text-be-red">{uploadError}</p> : null}
      {dragging ? (
        <div className="shrink-0 px-3 py-2 text-center text-sm font-semibold text-be-blue">Drop your Excel file to replace this table</div>
      ) : null}

      <div
        tabIndex={0}
        onKeyDown={onGridKeyDown}
        onPaste={onPaste}
        onCopy={onCopy}
        className="relative min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain outline-none"
      >
        <table className="sheet-grid w-max shrink-0 border-collapse text-sm" style={{ width: tableWidth, tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 48 }} />
            {columnWidths.map((width, col) => (
              <col key={col} style={{ width }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 border bg-be-navy text-xs font-bold text-white">#</th>
              {Array.from({ length: colCount }, (_, col) => (
                <th
                  key={col}
                  className="relative border bg-be-navy px-2 py-2 text-xs font-bold tracking-wide text-white"
                  onClick={() => {
                    setAnchor({ row: 0, col });
                    setSelected({ row: Math.max(0, rowCount - 1), col });
                  }}
                >
                  {colLabel(col)}
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize column ${colLabel(col)}`}
                    className="col-resizer"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      resizeRef.current = { col, startX: event.clientX, startWidth: columnWidths[col] };
                      document.body.classList.add("sheet-resizing");
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th
                  className="sticky left-0 z-10 cursor-pointer border bg-be-frost px-2 py-0 text-xs font-semibold text-be-navy/70"
                  onClick={() => {
                    setAnchor({ row: rowIndex, col: 0 });
                    setSelected({ row: rowIndex, col: Math.max(0, colCount - 1) });
                  }}
                >
                  {rowIndex + 1}
                </th>
                {row.map((cell, colIndex) => {
                  const isSelected = selected.row === rowIndex && selected.col === colIndex;
                  const isEditing = editing?.row === rowIndex && editing?.col === colIndex;
                  const inRange =
                    rowIndex >= bounds.rowStart &&
                    rowIndex <= bounds.rowEnd &&
                    colIndex >= bounds.colStart &&
                    colIndex <= bounds.colEnd;
                  const isHeader = rowIndex === 0;
                  const fill = fills[cellKey(rowIndex, colIndex)];
                  const background = fill || (isHeader ? "rgba(216, 176, 89, 0.15)" : "#ffffff");
                  const color = fill ? fillTextColor(fill) : undefined;
                  return (
                    <td
                      key={colIndex}
                      onMouseDown={(event) => {
                        if (event.button !== 0) return;
                        selectCell({ row: rowIndex, col: colIndex }, event.shiftKey);
                        setPointerSelecting(true);
                      }}
                      onMouseEnter={() => {
                        if (pointerSelecting && !resizeRef.current) {
                          setSelected({ row: rowIndex, col: colIndex });
                        }
                      }}
                      onDoubleClick={() => startEdit({ row: rowIndex, col: colIndex })}
                      className={`h-9 overflow-hidden border px-2 ${isHeader && !fill ? "font-semibold" : ""} ${
                        isSelected ? "ring-2 ring-inset ring-be-red" : inRange ? "ring-1 ring-inset ring-be-red/40" : ""
                      }`}
                      style={{ background, color, width: columnWidths[colIndex] }}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commitEdit}
                          className="h-full w-full bg-transparent outline-none"
                        />
                      ) : (
                        <span className="block truncate">{display(cell)}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-t border-be-ice bg-be-frost px-2 py-1.5">
        {workbook.sheets.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex items-center">
            {renameIndex === index ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => {
                  const name = renameValue.trim() || item.name;
                  const sheets = cloneSheets(workbook.sheets);
                  sheets[index].name = name.slice(0, 31);
                  onWorkbookChange({ ...workbook, sheets, updatedAt: new Date().toISOString() });
                  setRenameIndex(null);
                }}
                className="rounded-lg border border-be-red px-2 py-1 text-xs"
              />
            ) : (
              <button
                type="button"
                onClick={() => setActiveSheet(index)}
                onDoubleClick={() => {
                  setRenameIndex(index);
                  setRenameValue(item.name);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  index === activeSheet ? "bg-white text-be-red shadow-sm" : "text-be-navy/70 hover:bg-white/70"
                }`}
              >
                {item.name}
              </button>
            )}
            {workbook.sheets.length > 1 ? (
              <button
                type="button"
                aria-label={`Delete ${item.name}`}
                onClick={() => deleteSheet(index)}
                className="px-1 text-xs text-be-navy/40 hover:text-be-red"
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" onClick={addSheet} className="rounded-lg px-2 py-1 text-xs font-bold text-be-blue hover:bg-white">
          + Sheet
        </button>
      </div>
    </div>
  );
}
