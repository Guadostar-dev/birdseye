import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { getProject, saveAttachment } from "@/lib/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: Ctx) {
  const { error } = await requireApiSession(request);
  if (error) return error;
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a presentation file to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is larger than 8 MB." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const allowed = [".pptx", ".ppt", ".pdf", ".key"];
  if (!allowed.some((ext) => name.endsWith(ext))) {
    return NextResponse.json({ error: "Upload a PowerPoint, Keynote, or PDF presentation." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const attachment = await saveAttachment(id, {
    id: crypto.randomUUID(),
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    data: bytes.toString("base64"),
  });

  return NextResponse.json({ attachment }, { status: 201 });
}
