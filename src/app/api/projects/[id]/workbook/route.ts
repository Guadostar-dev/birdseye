import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { padSheet } from "@/lib/excel";
import { emptyWorkbook, getProject, getWorkbook, saveWorkbook } from "@/lib/store";
import type { Sheet, Workbook } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { error } = await requireApiSession(request);
  if (error) return error;
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const existing = await getWorkbook(id);
  const workbook = existing ?? emptyWorkbook(id);
  if (!existing) await saveWorkbook(workbook);
  return NextResponse.json({ workbook });
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { error } = await requireApiSession(request);
  if (error) return error;
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: { fileName?: string; sheets?: Sheet[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid workbook payload." }, { status: 400 });
  }

  if (!Array.isArray(body.sheets) || body.sheets.length === 0) {
    return NextResponse.json({ error: "A workbook needs at least one sheet." }, { status: 400 });
  }

  const sheets = body.sheets.map((sheet, index) =>
    padSheet(
      {
        name: (sheet.name || `Sheet${index + 1}`).slice(0, 31),
        rows: Array.isArray(sheet.rows) ? sheet.rows : [],
      },
      1,
      1,
    ),
  );

  const workbook: Workbook = {
    projectId: id,
    fileName: body.fileName || "tracker.xlsx",
    sheets,
    updatedAt: new Date().toISOString(),
  };
  await saveWorkbook(workbook);
  return NextResponse.json({ workbook });
}
