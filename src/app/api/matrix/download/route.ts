import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { writeExcel } from "@/lib/excel";
import { emptyManTechMatrix, getWorkbook } from "@/lib/store";
import { MATRIX_ID } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { error } = await requireApiSession(request);
  if (error) return error;
  const workbook = (await getWorkbook(MATRIX_ID)) ?? emptyManTechMatrix();
  const bytes = writeExcel(workbook);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="man-tech-matrix.xlsx"',
    },
  });
}
