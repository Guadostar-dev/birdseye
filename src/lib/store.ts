import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Project, Workbook } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const WORKBOOKS_DIR = path.join(DATA_DIR, "workbooks");

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function ensureDirs() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(WORKBOOKS_DIR, { recursive: true });
}

async function readProjects(): Promise<Project[]> {
  await ensureDirs();
  try {
    const raw = await readFile(PROJECTS_FILE, "utf8");
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeProjects(projects: Project[]) {
  await ensureDirs();
  await writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf8");
}

function workbookPath(projectId: string) {
  return path.join(WORKBOOKS_DIR, `${projectId}.json`);
}

export async function listProjects(): Promise<Project[]> {
  const projects = await readProjects();
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(id: string): Promise<Project | null> {
  const projects = await readProjects();
  return projects.find((p) => p.id === id) ?? null;
}

export async function saveProject(project: Project): Promise<Project> {
  return withLock(async () => {
    const projects = await readProjects();
    const index = projects.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.push(project);
    }
    await writeProjects(projects);
    return project;
  });
}

export async function deleteProject(id: string): Promise<boolean> {
  return withLock(async () => {
    const projects = await readProjects();
    const next = projects.filter((p) => p.id !== id);
    if (next.length === projects.length) return false;
    await writeProjects(next);
    try {
      const { unlink } = await import("fs/promises");
      await unlink(workbookPath(id));
    } catch {
      // no workbook stored
    }
    return true;
  });
}

export async function getWorkbook(projectId: string): Promise<Workbook | null> {
  try {
    const raw = await readFile(workbookPath(projectId), "utf8");
    return JSON.parse(raw) as Workbook;
  } catch {
    return null;
  }
}

export async function saveWorkbook(workbook: Workbook): Promise<Workbook> {
  return withLock(async () => {
    await ensureDirs();
    await writeFile(workbookPath(workbook.projectId), JSON.stringify(workbook), "utf8");
    const projects = await readProjects();
    const project = projects.find((p) => p.id === workbook.projectId);
    if (project) {
      const first = workbook.sheets[0];
      project.workbookName = workbook.fileName;
      project.sheetCount = workbook.sheets.length;
      project.rowCount = first?.rows.length ?? 0;
      project.colCount = Math.max(0, ...(first?.rows.map((r) => r.length) ?? [0]));
      project.updatedAt = workbook.updatedAt;
      await writeProjects(projects);
    }
    return workbook;
  });
}

export function emptyWorkbook(projectId: string, fileName = "tracker.xlsx"): Workbook {
  return {
    projectId,
    fileName,
    updatedAt: new Date().toISOString(),
    sheets: [
      {
        name: "Tracker",
        rows: [
          ["Task", "Owner", "Status", "Due date", "Priority", "Notes"],
          ["Set project goals", "", "Not started", "", "High", ""],
          ["Gather requirements", "", "Not started", "", "Medium", ""],
          ["Kick-off meeting", "", "Not started", "", "Medium", ""],
        ],
      },
    ],
  };
}

export function summarizeWorkbook(workbook: Workbook) {
  const first = workbook.sheets[0];
  return {
    workbookName: workbook.fileName,
    sheetCount: workbook.sheets.length,
    rowCount: first?.rows.length ?? 0,
    colCount: Math.max(0, ...(first?.rows.map((r) => r.length) ?? [0])),
  };
}
