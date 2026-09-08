import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { padSheet } from "@/lib/excel";
import { emptyManTechMatrix, getWorkbook, saveWorkbook } from "@/lib/store";
import { MATRIX_ID, type Sheet, type Workbook } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { error } = await requireApiSession(request);
  if (error) return error;
  const existing = await getWorkbook(MATRIX_ID);
  const workbook = existing ?? emptyManTechMatrix();
  if (!existing) await saveWorkbook(workbook);
  return NextResponse.json({ workbook });
}

export async function PUT(request: NextRequest) {
  const { error } = await requireApiSession(request);
  if (error) return error;

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
        columnWidths: Array.isArray(sheet.columnWidths) ? sheet.columnWidths : [],
        fills: sheet.fills && typeof sheet.fills === "object" ? sheet.fills : {},
      },
      1,
      1,
    ),
  );

  const workbook: Workbook = {
    projectId: MATRIX_ID,
    fileName: body.fileName || "man-tech-matrix.xlsx",
    sheets,
    updatedAt: new Date().toISOString(),
  };
  await saveWorkbook(workbook);
  return NextResponse.json({ workbook });
}
