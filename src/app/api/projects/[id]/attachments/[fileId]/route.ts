import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { deleteAttachment, getAttachment, getProject } from "@/lib/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; fileId: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { error } = await requireApiSession(request);
  if (error) return error;
  const { id, fileId } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const file = await getAttachment(id, fileId);
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  const bytes = Buffer.from(file.data, "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.fileName.replace(/[^\w.\- ]+/g, "_")}"`,
    },
  });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { error } = await requireApiSession(request);
  if (error) return error;
  const { id, fileId } = await params;
  const ok = await deleteAttachment(id, fileId);
  if (!ok) return NextResponse.json({ error: "File not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
