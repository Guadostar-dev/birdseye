export type ProjectStatus = "planning" | "active" | "on-hold" | "complete";

export type Slide = {
  id: string;
  title: string;
  body: string;
  notes: string;
};

export type AttachmentMeta = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

export type Project = {
  id: string;
  name: string;
  summary: string;
  writeup: string;
  status: ProjectStatus;
  owner: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  slides: Slide[];
  attachments: AttachmentMeta[];
};

export type CellValue = string | number | boolean | null;

export type Sheet = {
  name: string;
  rows: CellValue[][];
};

export type Workbook = {
  projectId: string;
  fileName: string;
  sheets: Sheet[];
  updatedAt: string;
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  "on-hold": "On hold",
  complete: "Complete",
};

export const MATRIX_ID = "man-tech-matrix";

export function emptySlide(): Slide {
  return {
    id: crypto.randomUUID(),
    title: "New slide",
    body: "",
    notes: "",
  };
}

export function normalizeProject(input: Partial<Project> & { description?: string }): Project {
  const description = typeof input.description === "string" ? input.description : "";
  return {
    id: input.id || crypto.randomUUID(),
    name: input.name || "Untitled project",
    summary: (input.summary ?? description).trim(),
    writeup: (input.writeup ?? description).trim(),
    status: input.status || "planning",
    owner: input.owner || "",
    dueDate: input.dueDate || "",
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || new Date().toISOString(),
    slides: Array.isArray(input.slides) ? input.slides : [],
    attachments: Array.isArray(input.attachments) ? input.attachments : [],
  };
}
