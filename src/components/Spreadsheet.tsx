"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CellValue, Sheet, Workbook } from "@/lib/types";
import { colLabel, parseClipboard } from "@/lib/grid";

type Props = {
  workbook: Workbook;
  onWorkbookChange: (workbook: Workbook) => void;
  saveState: "saved" | "saving" | "unsaved" | "error";
  uploadUrl: string;
  downloadUrl: string;
};

type Coord = { row: number; col: number };

function cloneSheets(sheets: Sheet[]): Sheet[] {
  return sheets.map((sheet) => ({
    name: sheet.name,
    rows: sheet.rows.map((row) => row.slice()),
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
  return { ...sheet, rows: nextRows };
}

function display(value: CellValue): string {
  if (value == null) return "";
  return String(value);
}

export function Spreadsheet({ workbook, onWorkbookChange, saveState, uploadUrl, downloadUrl }: Props) {
  const [activeSheet, setActiveSheet] = useState(0);
  const [selected, setSelected] = useState<Coord>({ row: 0, col: 0 });
  const [editing, setEditing] = useState<Coord | null>(null);
  const [draft, setDraft] = useState("");
  const [renameIndex, setRenameIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const sheet = workbook.sheets[activeSheet] ?? workbook.sheets[0];
  const rowCount = sheet?.rows.length ?? 0;
  const colCount = sheet?.rows[0]?.length ?? 0;

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
      setEditing(coord);
      setDraft(value);
    },
    [sheet],
  );

  const moveSelection = useCallback(
    (rowDelta: number, colDelta: number) => {
      setSelected((prev) => ({
        row: Math.max(0, Math.min(rowCount - 1, prev.row + rowDelta)),
        col: Math.max(0, Math.min(colCount - 1, prev.col + colDelta)),
      }));
    },
    [colCount, rowCount],
  );

  function addRow() {
    updateSheet((current) => {
      const cols = Math.max(1, ...current.rows.map((r) => r.length));
      return { ...current, rows: [...current.rows, Array.from({ length: cols }, () => "")] };
    });
  }

  function addColumn() {
    updateSheet((current) => ({
      ...current,
      rows: current.rows.map((row) => [...row, ""]),
    }));
  }

  function addSheet() {
    const sheets = cloneSheets(workbook.sheets);
    const cols = 8;
    sheets.push({
      name: `Sheet${sheets.length + 1}`,
      rows: Array.from({ length: 20 }, () => Array.from({ length: cols }, () => "")),
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
      moveSelection(-1, 0);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1, 0);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelection(0, -1);
    } else if (event.key === "ArrowRight" || event.key === "Tab") {
      event.preventDefault();
      moveSelection(0, event.shiftKey ? -1 : 1);
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
        if (rows[selected.row]) rows[selected.row][selected.col] = "";
        return { ...current, rows };
      });
    } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      startEdit(selected, event.key);
    }
  }

  const formulaLabel = useMemo(
    () => `${colLabel(selected.col)}${selected.row + 1}`,
    [selected.col, selected.row],
  );

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "unsaved"
        ? "Editing"
        : saveState === "error"
          ? "Save failed"
          : "Saved";

  return (
    <div
      className="flex min-h-[32rem] flex-col overflow-hidden rounded-2xl border border-be-ice bg-white shadow-sm"
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
      <div className="flex flex-wrap items-center gap-3 border-b border-be-ice px-3 py-2">
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
      {uploadError ? <p className="px-3 py-2 text-sm text-be-red">{uploadError}</p> : null}
      {dragging ? (
        <div className="px-3 py-2 text-center text-sm font-semibold text-be-blue">Drop your Excel file to replace this table</div>
      ) : null}

      <div
        tabIndex={0}
        onKeyDown={onGridKeyDown}
        onPaste={onPaste}
        onCopy={onCopy}
        className="relative min-h-0 flex-1 overflow-auto outline-none"
      >
        <table className="sheet-grid min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 w-12 border bg-be-navy text-xs font-bold text-white">#</th>
              {Array.from({ length: colCount }, (_, col) => (
                <th key={col} className="min-w-[7.5rem] border bg-be-navy px-2 py-2 text-xs font-bold tracking-wide text-white">
                  {colLabel(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th className="sticky left-0 z-10 border bg-be-frost px-2 py-0 text-xs font-semibold text-be-navy/70">
                  {rowIndex + 1}
                </th>
                {row.map((cell, colIndex) => {
                  const isSelected = selected.row === rowIndex && selected.col === colIndex;
                  const isEditing = editing?.row === rowIndex && editing?.col === colIndex;
                  const isHeader = rowIndex === 0;
                  return (
                    <td
                      key={colIndex}
                      onClick={() => setSelected({ row: rowIndex, col: colIndex })}
                      onDoubleClick={() => startEdit({ row: rowIndex, col: colIndex })}
                      className={`h-9 border px-2 ${isHeader ? "bg-be-gold/15 font-semibold" : "bg-white"} ${
                        isSelected ? "ring-2 ring-inset ring-be-red" : ""
                      }`}
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

      <div className="flex items-center gap-1 overflow-x-auto border-t border-be-ice bg-be-frost px-2 py-1.5">
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
