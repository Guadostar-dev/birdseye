"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Project, ProjectStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

const STATUSES: ProjectStatus[] = ["planning", "active", "on-hold", "complete"];

export function PortalDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ProjectStatus>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    summary: "",
    owner: "",
    dueDate: "",
    status: "planning" as ProjectStatus,
  });

  async function load() {
    const response = await fetch("/api/projects");
    if (response.status === 401) {
      router.push("/login");
      return;
    }
    const data = (await response.json()) as { projects?: Project[] };
    setProjects(data.projects || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    return projects.filter((project) => {
      const haystack = `${project.name} ${project.summary} ${project.writeup} ${project.owner}`.toLowerCase();
      return haystack.includes(query.toLowerCase()) && (!statusFilter || project.status === statusFilter);
    });
  }, [projects, query, statusFilter]);

  async function createProject(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { project?: Project; error?: string };
      if (!response.ok || !data.project) {
        setError(data.error || "Could not create project.");
        return;
      }
      router.push(`/portal/projects/${data.project.id}`);
    } catch {
      setError("Could not create project.");
    } finally {
      setCreating(false);
    }
  }

  async function removeProject(id: string) {
    if (!confirm("Delete this project write-up and its presentation?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((current) => current.filter((p) => p.id !== id));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-be-red">Projects</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-be-navy">Project write-ups</h1>
        <p className="mt-2 max-w-2xl text-sm text-be-navy/70">
          Capture the story of each piece of work, keep a presentation ready to share, and jump to the Man-Tech Matrix
          tab when you need the live capability table.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <form onSubmit={createProject} className="h-fit space-y-3 rounded-2xl border border-be-ice bg-white p-5 shadow-sm">
          <h2 className="text-sm font-extrabold uppercase tracking-[0.16em] text-be-navy">New write-up</h2>
          <Field label="Project name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
          <label className="block text-xs font-semibold text-be-navy/70">
            Short summary
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="mt-1 w-full rounded-xl border border-be-mist px-3 py-2 text-sm outline-none focus:border-be-red focus:ring-4 focus:ring-be-red/15"
              rows={4}
              placeholder="What is this project, and why does it matter?"
            />
          </label>
          <Field label="Owner" value={form.owner} onChange={(owner) => setForm({ ...form, owner })} />
          <label className="block text-xs font-semibold text-be-navy/70">
            Due date
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="mt-1 w-full rounded-xl border border-be-mist px-3 py-2 text-sm outline-none focus:border-be-red"
            />
          </label>
          <label className="block text-xs font-semibold text-be-navy/70">
            Status
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
              className="mt-1 w-full rounded-xl border border-be-mist px-3 py-2 text-sm outline-none focus:border-be-red"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="text-sm text-be-red">{error}</p> : null}
          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-xl bg-be-red py-2.5 text-sm font-bold text-white hover:bg-be-red-deep disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create write-up"}
          </button>
        </form>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search write-ups"
              className="min-w-[12rem] flex-1 rounded-xl border border-be-ice bg-white px-4 py-2.5 text-sm outline-none focus:border-be-red"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "" | ProjectStatus)}
              className="rounded-xl border border-be-ice bg-white px-3 py-2.5 text-sm"
            >
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-be-navy/60">Loading projects…</p>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-be-mist bg-white px-6 py-16 text-center">
              <p className="font-bold text-be-navy">No write-ups yet</p>
              <p className="mt-1 text-sm text-be-navy/70">Create a project on the left, then add the write-up and slides.</p>
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {visible.map((project) => (
                <li key={project.id} className="rounded-2xl border border-be-ice bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/portal/projects/${project.id}`} className="text-lg font-extrabold text-be-navy hover:text-be-red">
                        {project.name}
                      </Link>
                      <p className="mt-1 text-sm text-be-navy/70">{project.summary || "No summary yet"}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold status-${project.status}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-be-navy/70">
                    <div>
                      <dt className="font-semibold">Owner</dt>
                      <dd>{project.owner || "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Due</dt>
                      <dd>{project.dueDate || "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Slides</dt>
                      <dd>{project.slides.length}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Files</dt>
                      <dd>{project.attachments.length}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/portal/projects/${project.id}`}
                      className="rounded-xl bg-be-navy px-3 py-2 text-xs font-bold text-white hover:bg-be-blue"
                    >
                      Open write-up
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeProject(project.id)}
                      className="rounded-xl px-3 py-2 text-xs font-semibold text-be-red hover:bg-be-red/5"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-semibold text-be-navy/70">
      {label}
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-be-mist px-3 py-2 text-sm outline-none focus:border-be-red focus:ring-4 focus:ring-be-red/15"
      />
    </label>
  );
}
