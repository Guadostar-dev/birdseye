import type { Project, Workbook } from "./types";

const PROJECTS_KEY = "projects";

function workbookKey(projectId: string) {
  return `workbook:${projectId}`;
}

type KvLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete?(key: string): Promise<void>;
};

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function cloudflareKv(): Promise<KvLike | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const kv = env.PORTAL_KV;
    if (!kv) return null;
    return {
      get: (key) => kv.get(key),
      put: (key, value) => kv.put(key, value),
      delete: (key) => kv.delete(key),
    };
  } catch {
    return null;
  }
}

async function fileKv(): Promise<KvLike> {
  const { mkdir, readFile, writeFile, unlink } = await import("node:fs/promises");
  const path = await import("node:path");
  const dataDir = path.join(process.cwd(), "data");
  const workbooksDir = path.join(dataDir, "workbooks");
  await mkdir(dataDir, { recursive: true });
  await mkdir(workbooksDir, { recursive: true });

  function fileFor(key: string) {
    if (key === PROJECTS_KEY) return path.join(dataDir, "projects.json");
    const id = key.replace(/^workbook:/, "");
    return path.join(workbooksDir, `${id}.json`);
  }

  return {
    async get(key) {
      try {
        return await readFile(fileFor(key), "utf8");
      } catch {
        return null;
      }
    },
    async put(key, value) {
      await writeFile(fileFor(key), value, "utf8");
    },
    async delete(key) {
      try {
        await unlink(fileFor(key));
      } catch {
        // already gone
      }
    },
  };
}

async function backend(): Promise<KvLike> {
  return (await cloudflareKv()) ?? (await fileKv());
}

async function readProjects(): Promise<Project[]> {
  const kv = await backend();
  const raw = await kv.get(PROJECTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeProjects(projects: Project[]) {
  const kv = await backend();
  await kv.put(PROJECTS_KEY, JSON.stringify(projects, null, 2));
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
    const kv = await backend();
    await kv.delete?.(workbookKey(id));
    return true;
  });
}

export async function getWorkbook(projectId: string): Promise<Workbook | null> {
  const kv = await backend();
  const raw = await kv.get(workbookKey(projectId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Workbook;
  } catch {
    return null;
  }
}

export async function saveWorkbook(workbook: Workbook): Promise<Workbook> {
  return withLock(async () => {
    const kv = await backend();
    await kv.put(workbookKey(workbook.projectId), JSON.stringify(workbook));
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
