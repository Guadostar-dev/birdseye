export type ProjectStatus = "planning" | "active" | "on-hold" | "complete";

export type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  workbookName: string | null;
  sheetCount: number;
  rowCount: number;
  colCount: number;
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
