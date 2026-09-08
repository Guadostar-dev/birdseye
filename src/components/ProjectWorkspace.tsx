"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spreadsheet } from "@/components/Spreadsheet";
import type { Project, ProjectStatus, Workbook } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

const STATUSES: ProjectStatus[] = ["planning", "active", "on-hold", "complete"];

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [error, setError] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Workbook | null>(null);

  useEffect(() => {
    async function load() {
      const [projectRes, bookRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/workbook`),
      ]);
      if (projectRes.status === 401) {
        router.push("/login");
        return;
      }
      if (!projectRes.ok) {
        setError("Project not found.");
        return;
      }
      const projectData = (await projectRes.json()) as { project: Project };
      const bookData = (await bookRes.json()) as { workbook: Workbook };
      setProject(projectData.project);
      setWorkbook(bookData.workbook);
    }
    void load();
  }, [projectId, router]);

  const persistWorkbook = useCallback(
    async (next: Workbook) => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/projects/${projectId}/workbook`, {
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
    },
    [projectId],
  );

  function onWorkbookChange(next: Workbook) {
    pending.current = next;
    setWorkbook(next);
    setSaveState("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (pending.current) void persistWorkbook(pending.current);
    }, 450);
  }

  async function saveMeta(patch: Partial<Project>) {
    if (!project) return;
    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await response.json()) as { project?: Project };
    if (data.project) setProject(data.project);
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-bold text-be-navy">{error}</p>
        <Link href="/portal" className="mt-4 inline-block text-sm font-semibold text-be-red">
          Back to projects
        </Link>
      </div>
    );
  }

  if (!project || !workbook) {
    return <p className="px-6 py-16 text-sm text-be-navy/60">Loading project…</p>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/portal" className="text-xs font-bold uppercase tracking-[0.18em] text-be-blue">
            ← All projects
          </Link>
          <input
            value={project.name}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
            onBlur={() => saveMeta({ name: project.name })}
            className="mt-1 block w-full bg-transparent text-3xl font-extrabold tracking-tight text-be-navy outline-none"
          />
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold status-${project.status}`}>
          {STATUS_LABELS[project.status]}
        </span>
      </div>

      <div className="grid gap-3 rounded-2xl border border-be-ice bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="text-xs font-semibold text-be-navy/70">
          Owner
          <input
            value={project.owner}
            onChange={(e) => setProject({ ...project, owner: e.target.value })}
            onBlur={() => saveMeta({ owner: project.owner })}
            className="mt-1 w-full rounded-lg border border-be-mist px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-be-navy/70">
          Due date
          <input
            type="date"
            value={project.dueDate}
            onChange={(e) => {
              setProject({ ...project, dueDate: e.target.value });
              void saveMeta({ dueDate: e.target.value });
            }}
            className="mt-1 w-full rounded-lg border border-be-mist px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-be-navy/70">
          Status
          <select
            value={project.status}
            onChange={(e) => {
              const status = e.target.value as ProjectStatus;
              setProject({ ...project, status });
              void saveMeta({ status });
            }}
            className="mt-1 w-full rounded-lg border border-be-mist px-3 py-2 text-sm"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-be-navy/70 md:col-span-1">
          Notes
          <input
            value={project.description}
            onChange={(e) => setProject({ ...project, description: e.target.value })}
            onBlur={() => saveMeta({ description: project.description })}
            className="mt-1 w-full rounded-lg border border-be-mist px-3 py-2 text-sm"
          />
        </label>
      </div>

      <Spreadsheet
        projectId={projectId}
        workbook={workbook}
        onWorkbookChange={onWorkbookChange}
        saveState={saveState}
      />
    </div>
  );
}
