/**
 * Shared course-matching and module-resolution utilities.
 * Used by today, calendar, and fag/[id] pages — one implementation everywhere.
 */
import type { Course, ScheduleEvent, CanvasModule } from '@/types';
import { CANVAS_BOILERPLATE_MODULE } from '@/lib/canvasApi';

// ── ISO week number ───────────────────────────────────────────────────────────

export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ── Event → Course matching ───────────────────────────────────────────────────

/**
 * Fuzzy-match an ICS event title to the best-fitting course.
 * Normalises punctuation, splits into words >3 chars, scores by word overlap.
 */
export function matchEventToCourse(title: string, courses: Course[]): Course | undefined {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[()[\]:,./\\-]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = (s: string) => norm(s).split(' ').filter((w) => w.length > 3);

  const titleWords = words(title);
  if (titleWords.length === 0) return undefined;

  let best: Course | undefined;
  let bestScore = 0;

  for (const course of courses) {
    const cWords = words(course.name);
    let matches = 0;
    for (const cw of cWords) {
      if (titleWords.some((tw) => tw.startsWith(cw) || cw.startsWith(tw))) matches++;
    }
    const score = matches / Math.max(cWords.length, 1);
    if (score > bestScore && matches >= 1) { bestScore = score; best = course; }
  }
  return best;
}

/**
 * Resolve which course an ICS event belongs to.
 * Checks manual courseMapping first (from /mapping page), then fuzzy-matches.
 * This is the canonical lookup — use it everywhere instead of calling
 * matchEventToCourse directly.
 */
export function resolveCourseForEvent(
  eventTitle: string,
  courses: Course[],
  courseMapping: Record<string, string>,
): Course | undefined {
  const mappedId = courseMapping[eventTitle];
  if (mappedId) return courses.find((c) => c.id === mappedId);
  return matchEventToCourse(eventTitle, courses);
}

/**
 * Returns true if an event maps to a specific courseId (used for filtering).
 */
export function eventMatchesCourse(
  eventTitle: string,
  courseId: string,
  courseMapping: Record<string, string>,
  courses: Course[],
): boolean {
  const mapped = courseMapping[eventTitle];
  if (mapped) return mapped === courseId;
  return matchEventToCourse(eventTitle, courses)?.id === courseId;
}

// ── Module resolution ────────────────────────────────────────────────────────

/**
 * Returns all real (non-boilerplate) Canvas modules for a course, by position.
 */
export function getCourseModules(courseId: string, allModules: CanvasModule[]): CanvasModule[] {
  return allModules
    .filter((m) => m.courseId === courseId && m.name.toLowerCase().trim() !== CANVAS_BOILERPLATE_MODULE)
    .sort((a, b) => a.position - b.position);
}

/**
 * Chronological auto-match: given a lesson event, find the corresponding Canvas
 * module by position index (lesson 1 → module 1, lesson 2 → module 2, …).
 *
 * Deduplicates by date so double-booked slots count as one lesson.
 * Returns null if no match is possible.
 */
export function getAutoModule(
  event: ScheduleEvent,
  course: Course,
  allEvents: ScheduleEvent[],
  allModules: CanvasModule[],
  courseMapping: Record<string, string>,
  courses: Course[],
): CanvasModule | null {
  const modules = getCourseModules(course.id, allModules);
  if (modules.length === 0) return null;

  const seenDates = new Set<string>();
  const uniqueLessons = allEvents
    .filter((e) => eventMatchesCourse(e.title, course.id, courseMapping, courses))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .filter((e) => {
      const d = e.start.slice(0, 10);
      if (seenDates.has(d)) return false;
      seenDates.add(d);
      return true;
    });

  const idx = uniqueLessons.findIndex((l) => l.start.slice(0, 10) === event.start.slice(0, 10));
  if (idx === -1 || idx >= modules.length) return null;
  return modules[idx];
}

/**
 * Resolve which Canvas module corresponds to a lesson event.
 *   1. Week-number match: if any module for this course has `week === ISO week of event`, use it.
 *   2. Chronological fallback: match by position index (1st lesson → 1st module, etc.)
 *   3. null — caller decides fallback (show all modules, show flat docs, etc.)
 */
export function resolveModuleForEvent(
  event: ScheduleEvent,
  course: Course | undefined,
  allEvents: ScheduleEvent[],
  allModules: CanvasModule[],
  courseMapping: Record<string, string>,
  courses: Course[],
): CanvasModule | null {
  if (!course) return null;
  const modules = getCourseModules(course.id, allModules);
  if (modules.length === 0) return null;

  // 1. Week-number match
  const eventWeek = getISOWeek(new Date(event.start));
  const weekMatch = modules.find((m) => m.week === eventWeek);
  if (weekMatch) return weekMatch;

  // 2. Chronological index fallback
  return getAutoModule(event, course, allEvents, allModules, courseMapping, courses);
}

/**
 * Build a map from dateStr (YYYY-MM-DD) → 1-based lesson number for a course.
 * Used by the course detail page to label modules with their lesson number.
 */
export function buildLessonNumberMap(
  courseId: string,
  allEvents: ScheduleEvent[],
  courseMapping: Record<string, string>,
  courses: Course[],
): Map<string, number> {
  const seenDates = new Set<string>();
  const lessons = allEvents
    .filter((e) => eventMatchesCourse(e.title, courseId, courseMapping, courses))
    .sort((a, b) => a.start.localeCompare(b.start))
    .filter((e) => {
      const d = e.start.slice(0, 10);
      if (seenDates.has(d)) return false;
      seenDates.add(d);
      return true;
    });
  const map = new Map<string, number>();
  lessons.forEach((e, idx) => map.set(e.start.slice(0, 10), idx + 1));
  return map;
}
