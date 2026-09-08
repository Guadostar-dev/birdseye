import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { getProject, saveAttachment } from "@/lib/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function isImageFile(file: File) {
  if (ALLOWED_TYPES.has(file.type)) return true;
  return /\.(jpe?g|png|gif|webp)$/i.test(file.name);
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const { error } = await requireApiSession(request);
  if (error) return error;
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image to insert." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Images must be 4 MB or smaller." }, { status: 400 });
  }
  if (!isImageFile(file)) {
    return NextResponse.json({ error: "Use a JPG, PNG, GIF, or WebP image." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const attachment = await saveAttachment(id, {
    id: crypto.randomUUID(),
    fileName: file.name,
    mimeType: file.type || "image/png",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    kind: "image",
    data: bytes.toString("base64"),
  });

  return NextResponse.json(
    {
      attachment,
      url: `/api/projects/${id}/attachments/${attachment.id}`,
    },
    { status: 201 },
  );
}
