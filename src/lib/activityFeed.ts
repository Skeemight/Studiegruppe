import type { Course, Document, CanvasModule, ActivityItem } from '@/types';

export const ACTIVITY_FEED_KEY = 'sg_activity_feed';

const MAX_FEED_SIZE = 200;

export function readFeed(): ActivityItem[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_FEED_KEY);
    return raw ? (JSON.parse(raw) as ActivityItem[]) : [];
  } catch {
    return [];
  }
}

function writeFeed(items: ActivityItem[]) {
  localStorage.setItem(ACTIVITY_FEED_KEY, JSON.stringify(items));
}

export function appendFeedItems(newItems: ActivityItem[]) {
  if (newItems.length === 0) return;
  const existing = readFeed();
  const merged = [...newItems, ...existing].slice(0, MAX_FEED_SIZE);
  writeFeed(merged);
}

export function markAllSeen() {
  const items = readFeed();
  writeFeed(items.map((i) => ({ ...i, seen: true })));
}

export function unseenCount(): number {
  return readFeed().filter((i) => !i.seen).length;
}

/**
 * Compare docs+modules before and after a sync, generate ActivityItems and append to feed.
 * If prevDocs and prevModules are both empty, this is treated as the first sync —
 * a single summary item is generated instead of flooding with all-new items.
 */
export function generateActivityAfterSync(
  prevDocs: Document[],
  prevModules: CanvasModule[],
  nextDocs: Document[],
  nextModules: CanvasModule[],
  courses: Course[],
): void {
  const now = new Date().toISOString();
  const isFirst = prevDocs.length === 0 && prevModules.length === 0;

  if (isFirst) {
    if (nextDocs.length === 0 && nextModules.length === 0) return;
    appendFeedItems([{
      id: `sync_complete_${Date.now()}`,
      type: 'sync_complete',
      courseId: '',
      courseName: '',
      title: `${nextDocs.length} filer og ${nextModules.length} moduler hentet fra Canvas`,
      timestamp: now,
      seen: false,
    }]);
    return;
  }

  const prevDocIds = new Set(prevDocs.map((d) => d.id));
  const prevModuleIds = new Set(prevModules.map((m) => m.id));
  const newDocs = nextDocs.filter((d) => !prevDocIds.has(d.id));
  const newModules = nextModules.filter((m) => !prevModuleIds.has(m.id));

  const items: ActivityItem[] = [];

  // Group new docs by course — one item per course (or per file if just one)
  const docsByCourse = new Map<string, Document[]>();
  for (const doc of newDocs) {
    const arr = docsByCourse.get(doc.courseId) ?? [];
    arr.push(doc);
    docsByCourse.set(doc.courseId, arr);
  }
  for (const [courseId, docs] of docsByCourse) {
    const courseName = courses.find((c) => c.id === courseId)?.name ?? courseId;
    if (docs.length === 1) {
      items.push({
        id: `new_file_${docs[0].id}`,
        type: 'new_file',
        courseId,
        courseName,
        title: docs[0].title,
        url: docs[0].url,
        timestamp: now,
        seen: false,
      });
    } else {
      items.push({
        id: `new_files_${courseId}_${Date.now()}`,
        type: 'new_file',
        courseId,
        courseName,
        title: `${docs.length} nye filer`,
        timestamp: now,
        seen: false,
      });
    }
  }

  for (const mod of newModules) {
    const courseName = courses.find((c) => c.id === mod.courseId)?.name ?? mod.courseId;
    items.push({
      id: `new_module_${mod.id}`,
      type: 'new_module',
      courseId: mod.courseId,
      courseName,
      title: mod.name,
      timestamp: now,
      seen: false,
    });
  }

  if (items.length > 0) appendFeedItems(items);
}
