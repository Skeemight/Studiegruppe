import type { Course, Task, Document, CanvasModule, CanvasModuleItem } from '@/types';

export const CANVAS_URL_KEY = 'sg_canvas_url';
export const CANVAS_TOKEN_KEY = 'sg_canvas_token';
export const CANVAS_SELECTED_KEY = 'sg_canvas_selected_ids';
export const CANVAS_LAST_SYNC_KEY = 'sg_canvas_last_sync';
export const CANVAS_MERGE_RULES_KEY = 'sg_canvas_merge_rules';
export const CANVAS_FILE_ERRORS_KEY = 'sg_canvas_file_errors';
export const CANVAS_BOILERPLATE_MODULE = 'course description including examination rules';

export interface FileError {
  courseId: string;
  courseName: string;
  reason: string;
}

export interface MergeRule {
  keepId: string;   // canvas-{id}
  keepName: string; // display name at time of rule creation
  removeId: string; // canvas-{id}
  removeName: string;
  name: string;     // resulting merged name
}

export function getMergeRules(): MergeRule[] {
  try {
    return JSON.parse(localStorage.getItem(CANVAS_MERGE_RULES_KEY) ?? '[]') as MergeRule[];
  } catch { return []; }
}

export function saveMergeRule(rule: MergeRule) {
  const rules = getMergeRules().filter(
    (r) => !(r.keepId === rule.keepId && r.removeId === rule.removeId)
  );
  rules.push(rule);
  localStorage.setItem(CANVAS_MERGE_RULES_KEY, JSON.stringify(rules));
}

export function deleteMergeRule(keepId: string, removeId: string) {
  const rules = getMergeRules().filter(
    (r) => !(r.keepId === keepId && r.removeId === removeId)
  );
  localStorage.setItem(CANVAS_MERGE_RULES_KEY, JSON.stringify(rules));
}

export async function canvasFetch<T>(baseUrl: string, token: string, endpoint: string): Promise<T> {
  const params = new URLSearchParams({ baseUrl, token, endpoint });
  const res = await fetch(`/api/canvas?${params}`);
  const data = await res.json() as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data;
}

interface CanvasCourse {
  id: number;
  name: string;
}

interface CanvasAssignment {
  id: number;
  name: string;
  due_at: string | null;
}

interface CanvasFile {
  id: number;
  display_name: string;
  created_at: string;
}

interface CanvasModuleItemRaw {
  id: number;
  title: string;
  type: string;
  html_url?: string;
  url?: string;
}

interface CanvasModuleRaw {
  id: number;
  name: string;
  position: number;
  items?: CanvasModuleItemRaw[];
}

function parseWeekFromName(name: string): number | undefined {
  const patterns = [
    /(?:uge|week|modul|module)\s*(\d{1,2})/i,
    /^(\d{1,2})[^0-9]/,
    /\((\d{1,2})\)/,
  ];
  for (const p of patterns) {
    const m = name.match(p);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 53) return n;
    }
  }
  return undefined;
}

export interface SyncCallbacks {
  upsertCourses: (courses: Course[]) => void;
  upsertTasks: (tasks: Task[]) => void;
  upsertDocuments: (docs: Document[]) => void;
  upsertModules: (modules: CanvasModule[]) => void;
  pruneCanvasData: (keepIds: string[]) => void;
}

export interface SyncResult {
  courses: number;
  tasks: number;
  docs: number;
  modules: number;
  fileErrors: { courseName: string; reason: string }[];
}

function parseCourseCode(raw: string): { name: string; code?: string } {
  const match = raw.match(/\(([A-Z]{2,}\d+[A-Z]?)\)\s*$/);
  if (match) return { name: raw.slice(0, match.index).trim(), code: match[1] };
  return { name: raw };
}

export async function runCanvasSync(
  url: string,
  token: string,
  selectedIds: Set<number>,
  callbacks: SyncCallbacks
): Promise<SyncResult> {
  const cleanUrl = url.trim().replace(/\/$/, '');
  const cleanToken = token.trim();

  const allCourses = await canvasFetch<CanvasCourse[]>(cleanUrl, cleanToken, 'courses');
  const chosen = allCourses.filter((c) => selectedIds.has(c.id));
  if (chosen.length === 0) return { courses: 0, tasks: 0, docs: 0, modules: 0, fileErrors: [] };

  const mappedCourses: Course[] = chosen.map((c) => {
    const { name, code } = parseCourseCode(c.name);
    return { id: `canvas-${c.id}`, name, ...(code ? { code } : {}), semester: 'Forår 2026' };
  });

  callbacks.pruneCanvasData(mappedCourses.map((c) => c.id));
  callbacks.upsertCourses(mappedCourses);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);

  const [assignmentResults, fileResults, moduleResults] = await Promise.all([
    Promise.allSettled(
      chosen.map((c) => canvasFetch<CanvasAssignment[]>(cleanUrl, cleanToken, `courses/${c.id}/assignments`))
    ),
    Promise.allSettled(
      chosen.map((c) => canvasFetch<CanvasFile[]>(cleanUrl, cleanToken, `courses/${c.id}/files`))
    ),
    Promise.allSettled(
      chosen.map((c) => canvasFetch<CanvasModuleRaw[]>(cleanUrl, cleanToken, `courses/${c.id}/modules`))
    ),
  ]);

  const mappedTasks: Task[] = [];
  assignmentResults.forEach((res, i) => {
    if (res.status !== 'fulfilled') return;
    const course = chosen[i];
    res.value.forEach((a) => {
      if (!a.due_at || new Date(a.due_at) < cutoff) return;
      mappedTasks.push({
        id: `canvas-task-${a.id}`,
        title: a.name,
        courseId: `canvas-${course.id}`,
        deadline: a.due_at.slice(0, 10),
        status: 'todo',
        assignedTo: '',
        url: `${cleanUrl}/courses/${course.id}/assignments/${a.id}`,
      });
    });
  });
  callbacks.upsertTasks(mappedTasks);

  const mappedDocs: Document[] = [];
  const fileErrors: { courseName: string; reason: string }[] = [];
  const persistedErrors: FileError[] = [];

  fileResults.forEach((res, i) => {
    const course = chosen[i];
    if (res.status === 'rejected') {
      const msg = res.reason instanceof Error ? res.reason.message : String(res.reason);
      fileErrors.push({ courseName: course.name, reason: msg });
      persistedErrors.push({ courseId: `canvas-${course.id}`, courseName: course.name, reason: msg });
      // Fallback: files API blocked — extract module items as flat documents instead
      const modRes = moduleResults[i];
      if (modRes?.status === 'fulfilled') {
        modRes.value.forEach((mod) => {
          (mod.items ?? [])
            .filter((item) => item.type !== 'SubHeader' && (item.html_url ?? item.url))
            .forEach((item) => {
              const ext = item.title.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase() ?? '';
              mappedDocs.push({
                id: `canvas-moditem-doc-${item.id}`,
                title: item.title,
                courseId: `canvas-${course.id}`,
                url: (item.html_url ?? item.url) as string,
                tags: ext ? [ext] : [],
                createdAt: undefined,
              });
            });
        });
      }
      return;
    }
    const ext = (f: CanvasFile) => f.display_name.split('.').pop()?.toLowerCase() ?? '';
    res.value.forEach((f) => {
      mappedDocs.push({
        id: `canvas-file-${f.id}`,
        title: f.display_name,
        courseId: `canvas-${course.id}`,
        url: `${cleanUrl}/courses/${course.id}/files/${f.id}`,
        tags: ext(f) ? [ext(f)] : [],
        createdAt: f.created_at,
      });
    });
  });
  callbacks.upsertDocuments(mappedDocs);

  // Persist file errors so the documents page can show a warning badge
  localStorage.setItem(CANVAS_FILE_ERRORS_KEY, JSON.stringify(persistedErrors));

  // Map modules
  const mappedModules: CanvasModule[] = [];
  moduleResults.forEach((res, i) => {
    if (res.status !== 'fulfilled') return;
    const course = chosen[i];
    const courseId = `canvas-${course.id}`;
    res.value.forEach((mod) => {
      const items: CanvasModuleItem[] = (mod.items ?? [])
        .filter((item) => item.type !== 'SubHeader' && (item.html_url ?? item.url))
        .map((item) => ({
          id: `canvas-moditem-${item.id}`,
          title: item.title,
          type: item.type,
          url: (item.html_url ?? item.url) as string,
        }));
      mappedModules.push({
        id: `canvas-mod-${mod.id}`,
        courseId,
        name: mod.name,
        week: parseWeekFromName(mod.name),
        position: mod.position,
        items,
      });
    });
  });
  callbacks.upsertModules(mappedModules);

  return { courses: mappedCourses.length, tasks: mappedTasks.length, docs: mappedDocs.length, modules: mappedModules.length, fileErrors };
}
