'use client';

import { useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/store/AppContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { getCourseColor } from '@/lib/courseColors';
import { MapPin, ChevronRight, BookOpen, Clock, ExternalLink, AlertCircle, FileText } from 'lucide-react';
import type { Course, Document } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateShort(isoDate: string): string {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Extract YYYY-MM-DD safely from any ISO string, returns '' for falsy input */
function dateStr(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function daysFromNow(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate + 'T12:00:00');
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function matchEventToCourse(title: string, courses: Course[]): Course | undefined {
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

function fileExt(doc: Document): string {
  return (doc.tags[0] ?? doc.url.split('.').pop()?.split('?')[0] ?? '').toLowerCase();
}

// ── CourseFileList ─────────────────────────────────────────────────────────────

function CourseFileList({ docs }: { docs: Document[] }) {
  if (docs.length === 0) return null;

  return (
    <details className="mt-3" onClick={(e) => e.stopPropagation()}>
      <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1.5 select-none list-none">
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        Filer · {docs.length} {docs.length === 1 ? 'fil' : 'filer'}
      </summary>
      <ul className="mt-2 pl-5 space-y-1.5">
        {docs.map((doc) => {
          const ext = fileExt(doc);
          return (
            <li key={doc.id}>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                <FileText className="w-3 h-3 shrink-0" />
                <span>{doc.title}</span>
                {ext && (
                  <span className="text-[10px] text-gray-400 uppercase font-mono">{ext}</span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const { scheduleEvents, documents, courses, tasks, exams } = useApp();
  const [prepared, setPrepared] = useLocalStorage<Record<string, boolean>>('sg_today_prepared', {});
  const [courseMapping] = useLocalStorage<Record<string, string>>('sg_course_mapping', {});

  const today = new Date();
  const todayStr = localDateStr(today);


  const todayEvents = useMemo(() =>
    scheduleEvents
      .filter((e) => dateStr(e.start) === todayStr)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [scheduleEvents, todayStr]
  );

  // Next school day when today is empty
  const nextDayEvents = useMemo(() => {
    if (todayEvents.length > 0) return [];
    const future = scheduleEvents
      .filter((e) => dateStr(e.start) > todayStr)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    if (future.length === 0) return [];
    const nextDateStr = dateStr(future[0].start);
    return future.filter((e) => dateStr(e.start) === nextDateStr);
  }, [scheduleEvents, todayEvents.length, todayStr]);

  // All upcoming deadlines (overdue first, then sorted by date — no window cap)
  const upcoming = useMemo(() => {
    const items: { id: string; title: string; date: string; courseId: string; kind: 'task' | 'exam'; overdue: boolean; url?: string }[] = [];

    tasks.forEach((t) => {
      if (t.status === 'done') return;
      const d = dateStr(t.deadline);
      if (!d) return;
      items.push({ id: t.id, title: t.title, date: d, courseId: t.courseId, kind: 'task', overdue: d < todayStr, url: t.url });
    });

    exams.forEach((e) => {
      const d = dateStr(e.date);
      if (!d) return;
      items.push({ id: e.id, title: e.title ?? e.courseName ?? 'Eksamen', date: d, courseId: e.courseId, kind: 'exam', overdue: d < todayStr });
    });

    return items.sort((a, b) => {
      if (a.overdue && !b.overdue) return -1;
      if (!a.overdue && b.overdue) return 1;
      return a.date.localeCompare(b.date);
    });
  }, [tasks, exams, todayStr]);

  // Unique event titles with no mapping (for banner)
  const unmappedTitles = useMemo(() => {
    const titles = [...new Set(scheduleEvents.map((e) => e.title))];
    return titles.filter((t) => !courseMapping[t]);
  }, [scheduleEvents, courseMapping]);

  function getResolvedCourse(eventTitle: string): Course | undefined {
    const mappedId = courseMapping[eventTitle];
    if (mappedId) return courses.find((c) => c.id === mappedId);
    return matchEventToCourse(eventTitle, courses);
  }

  function getDocsForCourse(courseId: string): Document[] {
    return documents
      .filter((d) => d.courseId === courseId)
      .sort((a, b) => {
        // Sort by createdAt descending if available, else by Canvas file ID descending
        if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
        const idA = parseInt(a.id.replace('canvas-file-', ''), 10) || 0;
        const idB = parseInt(b.id.replace('canvas-file-', ''), 10) || 0;
        return idB - idA;
      });
  }

  function togglePrepared(eventId: string) {
    const key = `${todayStr}-${eventId}`;
    setPrepared((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function isPrepared(eventId: string): boolean {
    return !!prepared[`${todayStr}-${eventId}`];
  }

  const weekday = today.toLocaleDateString('da-DK', { weekday: 'long' });
  const dateLabel = today.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 capitalize">{weekday}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
      </div>

      {/* Mapping banner */}
      {scheduleEvents.length > 0 && unmappedTitles.length > 0 && documents.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium text-amber-800">
              {unmappedTitles.length} skema-hold er ikke koblet til Canvas-kurser
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Gå til{' '}
              <Link href="/settings" className="font-semibold underline hover:text-amber-800">
                Indstillinger
              </Link>{' '}
              for at koble dem, så du ser de rigtige filer.
            </p>
          </div>
        </div>
      )}

      {/* ── Today's lessons ── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Dagens undervisning
        </h2>

        {todayEvents.length > 0 ? (
          <ul className="space-y-3">
            {todayEvents.map((event) => {
              const course = getResolvedCourse(event.title);
              const colors = getCourseColor(course?.color, course?.id);
              const courseDocs = course ? getDocsForCourse(course.id) : [];
              const done = isPrepared(event.id);

              return (
                <li
                  key={event.id}
                  className={`bg-white rounded-xl border border-gray-100 px-4 py-4 border-l-4 ${colors.border} transition-opacity ${done ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{event.title}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {fmtTime(event.start)}–{fmtTime(event.end)}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                        {course && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                            {course.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Prepared checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => togglePrepared(event.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                      />
                      <span className={`text-xs font-medium ${done ? 'text-green-600' : 'text-gray-400'}`}>
                        {done ? 'Forberedt' : 'Forberedt?'}
                      </span>
                    </label>
                  </div>

                  <CourseFileList docs={courseDocs} />
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-6 text-center space-y-1">
            <p className="text-sm font-medium text-gray-700">Ingen undervisning i dag</p>
            {nextDayEvents.length > 0 && (
              <p className="text-xs text-gray-400">
                Næste undervisningsdag:{' '}
                <span className="font-medium text-gray-600">
                  {new Date(nextDayEvents[0].start + (nextDayEvents[0].start.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                {' '}· {nextDayEvents.length} hold
              </p>
            )}
            {scheduleEvents.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">
                Importer dit skema via{' '}
                <Link href="/calendar" className="text-blue-600 hover:underline">Tidslinje</Link>
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Upcoming deadlines ── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Kommende afleveringer
        </h2>

        {upcoming.length > 0 ? (
          <ul className="space-y-2">
            {upcoming.map((item) => {
              const course = courses.find((c) => c.id === item.courseId);
              const colors = getCourseColor(course?.color, course?.id);
              const days = daysFromNow(item.date);
              const isToday = days === 0;
              const isTomorrow = days === 1;
              const dayLabel = item.overdue
                ? `${Math.abs(days)} dag${Math.abs(days) !== 1 ? 'e' : ''} over`
                : isToday ? 'I dag'
                : isTomorrow ? 'I morgen'
                : days <= 7 ? `Om ${days} dage`
                : fmtDateShort(item.date);

              return (
                <li
                  key={item.id}
                  className={`bg-white rounded-xl border border-gray-100 px-4 py-3 border-l-4 ${colors.border} flex items-center justify-between gap-4`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {item.kind === 'exam'
                        ? <BookOpen className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        : <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 hover:underline flex items-center gap-1">
                          {item.title}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      )}
                    </div>
                    {course && (
                      <p className="text-xs text-gray-400 pl-5">{course.name}</p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${item.overdue ? 'text-red-600' : isToday ? 'text-red-500' : isTomorrow ? 'text-orange-500' : 'text-gray-500'}`}>
                    {dayLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-6 text-center">
            <p className="text-sm text-gray-400">
              {tasks.length === 0 && exams.length === 0
                ? 'Ingen opgaver eller eksamener registreret endnu'
                : 'Ingen aktive deadlines — godt arbejde!'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
