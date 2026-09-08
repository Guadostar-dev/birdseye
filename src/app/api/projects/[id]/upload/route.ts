import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { parseExcel } from "@/lib/excel";
import { getProject, saveProject, saveWorkbook } from "@/lib/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: Ctx) {
  const { error } = await requireApiSession(request);
  if (error) return error;
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an Excel file to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is larger than 10 MB." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
    return NextResponse.json(
      { error: "Upload an Excel workbook (.xlsx / .xls) or a CSV file." },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let workbook;
  try {
    workbook = parseExcel(bytes, id, file.name);
  } catch {
    return NextResponse.json({ error: "We couldn’t read that spreadsheet." }, { status: 400 });
  }

  await saveWorkbook(workbook);
  const first = workbook.sheets[0];
  project.workbookName = workbook.fileName;
  project.sheetCount = workbook.sheets.length;
  project.rowCount = first?.rows.length ?? 0;
  project.colCount = Math.max(0, ...(first?.rows.map((r) => r.length) ?? [0]));
  project.updatedAt = workbook.updatedAt;
  await saveProject(project);

  return NextResponse.json({ project, workbook });
}
