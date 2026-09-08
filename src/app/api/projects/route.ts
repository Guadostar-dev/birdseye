import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { emptyWorkbook, listProjects, saveProject, saveWorkbook } from "@/lib/store";
import type { Project, ProjectStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: ProjectStatus[] = ["planning", "active", "on-hold", "complete"];

export async function GET(request: NextRequest) {
  const { error } = await requireApiSession(request);
  if (error) return error;
  const projects = await listProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const { error } = await requireApiSession(request);
  if (error) return error;

  let body: Partial<Project> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = (body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Give the project a name." }, { status: 400 });
  }

  const status = STATUSES.includes(body.status as ProjectStatus)
    ? (body.status as ProjectStatus)
    : "planning";
  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    description: (body.description || "").trim(),
    status,
    owner: (body.owner || "").trim(),
    dueDate: body.dueDate || "",
    createdAt: now,
    updatedAt: now,
    workbookName: "tracker.xlsx",
    sheetCount: 1,
    rowCount: 4,
    colCount: 6,
  };

  await saveProject(project);
  await saveWorkbook(emptyWorkbook(project.id));
  return NextResponse.json({ project }, { status: 201 });
}
