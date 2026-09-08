import type { AttachmentMeta, Project, Workbook } from "./types";
import { MATRIX_ID, normalizeProject } from "./types";

const PROJECTS_KEY = "projects";

function workbookKey(id: string) {
  return `workbook:${id}`;
}

function attachmentKey(projectId: string, fileId: string) {
  return `attachment:${projectId}:${fileId}`;
}

type KvLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete?(key: string): Promise<void>;
};

export type StoredAttachment = AttachmentMeta & { data: string };

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
  await mkdir(dataDir, { recursive: true });

  function fileFor(key: string) {
    if (key === PROJECTS_KEY) return path.join(dataDir, "projects.json");
    return `${path.join(dataDir, ...key.split(":"))}.json`;
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
      const file = fileFor(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, value, "utf8");
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
    const parsed = JSON.parse(raw) as Array<Partial<Project> & { description?: string }>;
    return Array.isArray(parsed) ? parsed.map(normalizeProject) : [];
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
    const normalized = normalizeProject(project);
    const projects = await readProjects();
    const index = projects.findIndex((p) => p.id === normalized.id);
    if (index >= 0) {
      projects[index] = normalized;
    } else {
      projects.push(normalized);
    }
    await writeProjects(projects);
    return normalized;
  });
}

export async function deleteProject(id: string): Promise<boolean> {
  return withLock(async () => {
    const projects = await readProjects();
    const project = projects.find((p) => p.id === id);
    if (!project) return false;
    await writeProjects(projects.filter((p) => p.id !== id));
    const kv = await backend();
    await kv.delete?.(workbookKey(id));
    for (const file of project.attachments) {
      await kv.delete?.(attachmentKey(id, file.id));
    }
    return true;
  });
}

export async function getWorkbook(id: string): Promise<Workbook | null> {
  const kv = await backend();
  const raw = await kv.get(workbookKey(id));
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
    return workbook;
  });
}

export async function saveAttachment(projectId: string, file: StoredAttachment): Promise<AttachmentMeta> {
  return withLock(async () => {
    const projects = await readProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project) throw new Error("Project not found.");
    const kv = await backend();
    await kv.put(attachmentKey(projectId, file.id), JSON.stringify(file));
    const meta: AttachmentMeta = {
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
      uploadedAt: file.uploadedAt,
    };
    project.attachments = [...project.attachments.filter((item) => item.id !== file.id), meta];
    project.updatedAt = new Date().toISOString();
    await writeProjects(projects);
    return meta;
  });
}

export async function getAttachment(projectId: string, fileId: string): Promise<StoredAttachment | null> {
  const kv = await backend();
  const raw = await kv.get(attachmentKey(projectId, fileId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAttachment;
  } catch {
    return null;
  }
}

export async function deleteAttachment(projectId: string, fileId: string): Promise<boolean> {
  return withLock(async () => {
    const projects = await readProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project) return false;
    project.attachments = project.attachments.filter((item) => item.id !== fileId);
    project.updatedAt = new Date().toISOString();
    await writeProjects(projects);
    const kv = await backend();
    await kv.delete?.(attachmentKey(projectId, fileId));
    return true;
  });
}

export function emptyManTechMatrix(): Workbook {
  const blank = Array.from({ length: 12 }, () => ["", "", "", "", "", "", "Not started", "", "", ""]);
  return {
    projectId: MATRIX_ID,
    fileName: "man-tech-matrix.xlsx",
    updatedAt: new Date().toISOString(),
    sheets: [
      {
        name: "Man-Tech Matrix",
        rows: [
          [
            "Capability / process",
            "Current level",
            "Target level",
            "Gap",
            "Owner",
            "Equipment / method",
            "Status",
            "Priority",
            "Next action",
            "Notes",
          ],
          ...blank,
        ],
      },
    ],
  };
}

export function emptyWorkbook(projectId: string, fileName = "tracker.xlsx"): Workbook {
  return { ...emptyManTechMatrix(), projectId, fileName };
}
