import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { listProjects, saveProject } from "@/lib/store";
import { normalizeProject, type Project, type ProjectStatus } from "@/lib/types";

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
  const project = normalizeProject({
    id: crypto.randomUUID(),
    name,
    summary: (body.summary || "").trim(),
    writeup: (body.writeup || body.summary || "").trim(),
    status,
    owner: (body.owner || "").trim(),
    dueDate: body.dueDate || "",
    createdAt: now,
    updatedAt: now,
    slides: [
      {
        id: crypto.randomUUID(),
        title: name,
        body: (body.summary || "Add the story of this project here.").trim(),
        notes: "",
      },
    ],
    attachments: [],
  });

  await saveProject(project);
  return NextResponse.json({ project }, { status: 201 });
}
