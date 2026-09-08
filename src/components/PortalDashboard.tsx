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
    description: "",
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
    const data = (await response.json()) as { projects?: Project[]; error?: string };
    setProjects(data.projects || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // Load once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    return projects.filter((project) => {
      const haystack = `${project.name} ${project.description} ${project.owner}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesStatus = !statusFilter || project.status === statusFilter;
      return matchesQuery && matchesStatus;
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
    if (!confirm("Delete this project and its spreadsheet?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((current) => current.filter((p) => p.id !== id));
  }

  const counts = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    complete: projects.filter((p) => p.status === "complete").length,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-be-red">Private portal</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-be-navy">Your projects</h1>
          <p className="mt-2 max-w-2xl text-sm text-be-navy/70">
            Create a tracker, then upload an Excel table to edit it live in the browser. Changes autosave and can be
            downloaded back as .xlsx.
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Projects" value={counts.total} />
        <Stat label="Active" value={counts.active} />
        <Stat label="Complete" value={counts.complete} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <form onSubmit={createProject} className="h-fit space-y-3 rounded-2xl border border-be-ice bg-white p-5 shadow-sm">
          <h2 className="text-sm font-extrabold uppercase tracking-[0.16em] text-be-navy">New project</h2>
          <Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
          <label className="block text-xs font-semibold text-be-navy/70">
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-xl border border-be-mist px-3 py-2 text-sm outline-none focus:border-be-red focus:ring-4 focus:ring-be-red/15"
              rows={3}
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
            {creating ? "Creating…" : "Create project"}
          </button>
        </form>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects"
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
              <p className="font-bold text-be-navy">No projects yet</p>
              <p className="mt-1 text-sm text-be-navy/70">Create one on the left, then upload an Excel table to edit live.</p>
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
                      <p className="mt-1 text-sm text-be-navy/70">{project.description || "No description"}</p>
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
                      <dt className="font-semibold">Workbook</dt>
                      <dd>{project.workbookName || "Untitled"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Updated</dt>
                      <dd>{new Date(project.updatedAt).toLocaleString()}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/portal/projects/${project.id}`}
                      className="rounded-xl bg-be-navy px-3 py-2 text-xs font-bold text-white hover:bg-be-blue"
                    >
                      Open table
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-be-ice bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-be-blue">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-be-navy">{value}</p>
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
