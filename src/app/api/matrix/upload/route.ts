import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { parseExcel } from "@/lib/excel";
import { saveWorkbook } from "@/lib/store";
import { MATRIX_ID } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const { error } = await requireApiSession(request);
  if (error) return error;

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
    workbook = parseExcel(bytes, MATRIX_ID, file.name);
  } catch {
    return NextResponse.json({ error: "We couldn’t read that spreadsheet." }, { status: 400 });
  }

  workbook.projectId = MATRIX_ID;
  await saveWorkbook(workbook);
  return NextResponse.json({ workbook });
}
