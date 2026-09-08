"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PresentationDeck } from "@/components/PresentationDeck";
import { WriteupEditor } from "@/components/WriteupEditor";
import type { AttachmentMeta, Project, ProjectStatus, Slide } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

const STATUSES: ProjectStatus[] = ["planning", "active", "on-hold", "complete"];

export function ProjectWriteup({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [error, setError] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Project | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        setError("Project not found.");
        return;
      }
      const data = (await response.json()) as { project: Project };
      setProject(data.project);
    }
    void load();
  }, [projectId, router]);

  const persist = useCallback(
    async (next: Project) => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: next.name,
            summary: next.summary,
            writeup: next.writeup,
            owner: next.owner,
            dueDate: next.dueDate,
            status: next.status,
            slides: next.slides,
          }),
        });
        if (!response.ok) throw new Error("save failed");
        const data = (await response.json()) as { project: Project };
        setProject(data.project);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [projectId],
  );

  function update(patch: Partial<Project>) {
    if (!project) return;
    const next = { ...project, ...patch, updatedAt: new Date().toISOString() };
    pending.current = next;
    setProject(next);
    setSaveState("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (pending.current) void persist(pending.current);
    }, 450);
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

  if (!project) {
    return <p className="px-6 py-16 text-sm text-be-navy/60">Loading write-up…</p>;
  }

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "unsaved" ? "Editing" : saveState === "error" ? "Save failed" : "Saved";

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link href="/portal" className="text-xs font-bold uppercase tracking-[0.18em] text-be-blue">
            ← All projects
          </Link>
          <input
            value={project.name}
            onChange={(e) => update({ name: e.target.value })}
            className="mt-1 block w-full bg-transparent text-3xl font-extrabold tracking-tight text-be-navy outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold status-${project.status}`}>
            {STATUS_LABELS[project.status]}
          </span>
          <span className="rounded-full bg-be-frost px-3 py-1 text-[11px] font-semibold text-be-navy/70">{saveLabel}</span>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-be-ice bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="text-xs font-semibold text-be-navy/70">
          Owner
          <input
            value={project.owner}
            onChange={(e) => update({ owner: e.target.value })}
            className="mt-1 w-full rounded-lg border border-be-mist px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-be-navy/70">
          Due date
          <input
            type="date"
            value={project.dueDate}
            onChange={(e) => update({ dueDate: e.target.value })}
            className="mt-1 w-full rounded-lg border border-be-mist px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-be-navy/70">
          Status
          <select
            value={project.status}
            onChange={(e) => update({ status: e.target.value as ProjectStatus })}
            className="mt-1 w-full rounded-lg border border-be-mist px-3 py-2 text-sm"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-be-navy/70">
          Summary
          <input
            value={project.summary}
            onChange={(e) => update({ summary: e.target.value })}
            className="mt-1 w-full rounded-lg border border-be-mist px-3 py-2 text-sm"
          />
        </label>
      </div>

      <section className="rounded-2xl border border-be-ice bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.16em] text-be-navy">Write-up</h2>
          <p className="mt-1 text-sm text-be-navy/70">
            Format headings, emphasis, lists, tables, and images so this reads like a proper project brief.
          </p>
        </div>
        <WriteupEditor
          key={project.id}
          projectId={project.id}
          initialHtml={project.writeup}
          onChange={(writeup) => update({ writeup })}
        />
      </section>

      <PresentationDeck
        projectId={project.id}
        slides={project.slides}
        attachments={project.attachments}
        onSlidesChange={(slides: Slide[]) => update({ slides })}
        onAttachmentsChange={(attachments: AttachmentMeta[]) => setProject({ ...project, attachments })}
      />
    </div>
  );
}
