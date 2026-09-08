"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Spreadsheet } from "@/components/Spreadsheet";
import type { Workbook } from "@/lib/types";

export function MatrixWorkspace() {
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [error, setError] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Workbook | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/matrix");
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok) {
        setError("Could not load the Man-Tech Matrix.");
        return;
      }
      const data = (await response.json()) as { workbook: Workbook };
      setWorkbook(data.workbook);
    }
    void load();
  }, []);

  const persist = useCallback(async (next: Workbook) => {
    setSaveState("saving");
    try {
      const response = await fetch("/api/matrix", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: next.fileName, sheets: next.sheets }),
      });
      if (!response.ok) throw new Error("save failed");
      const data = (await response.json()) as { workbook: Workbook };
      setWorkbook(data.workbook);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, []);

  function onWorkbookChange(next: Workbook) {
    pending.current = next;
    setWorkbook(next);
    setSaveState("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (pending.current) void persist(pending.current);
    }, 450);
  }

  if (error) {
    return <p className="px-6 py-16 text-sm text-be-red">{error}</p>;
  }

  if (!workbook) {
    return <p className="px-6 py-16 text-sm text-be-navy/60">Loading Man-Tech Matrix…</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-4 pb-12 pt-4 sm:px-6">
      <div className="shrink-0 pb-3">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-be-red">Man-Tech Matrix</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-be-navy sm:text-3xl">Live capability table</h1>
        <p className="mt-1 max-w-3xl text-sm text-be-navy/70">
          Scroll inside the table to keep the colour bar in place. Drag column edges to resize, then download as .xlsx.
          Changes autosave.
        </p>
      </div>
      <Spreadsheet
        workbook={workbook}
        onWorkbookChange={onWorkbookChange}
        saveState={saveState}
        uploadUrl="/api/matrix/upload"
        downloadUrl="/api/matrix/download"
      />
    </div>
  );
}
