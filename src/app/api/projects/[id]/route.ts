import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { deleteProject, getProject, saveProject } from "@/lib/store";
import type { ProjectStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: ProjectStatus[] = ["planning", "active", "on-hold", "complete"];

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { error } = await requireApiSession(request);
  if (error) return error;
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { error } = await requireApiSession(request);
  if (error) return error;
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Give the project a name." }, { status: 400 });
    project.name = name;
  }
  if (typeof body.description === "string") project.description = body.description.trim();
  if (typeof body.owner === "string") project.owner = body.owner.trim();
  if (typeof body.dueDate === "string") project.dueDate = body.dueDate;
  if (typeof body.status === "string" && STATUSES.includes(body.status as ProjectStatus)) {
    project.status = body.status as ProjectStatus;
  }
  project.updatedAt = new Date().toISOString();
  await saveProject(project);
  return NextResponse.json({ project });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { error } = await requireApiSession(request);
  if (error) return error;
  const { id } = await params;
  const ok = await deleteProject(id);
  if (!ok) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
