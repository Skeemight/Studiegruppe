'use client';

import { useMemo, useEffect, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { getCourseColor, getCourseHex } from '@/lib/courseColors';
import { resolveCourseForEvent, resolveModuleForEvent } from '@/lib/courseUtils';
import { MapPin, BookOpen, Clock, ExternalLink, AlertTriangle, FileText, Link2, Check, Users, Calendar, BookMarked } from 'lucide-react';
import { CANVAS_FILE_ERRORS_KEY, type FileError } from '@/lib/canvasApi';
import { LessonNotes } from '@/components/lesson-notes/LessonNotes';
import { StudyPageViewer } from '@/components/study-pages/StudyPageViewer';
import type { Document, CanvasModule, CanvasModuleItem, ScheduleEvent, Course, StudyPage } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
}

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

function fmtLongDate(isoDate: string): string {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('da-DK', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function fmtShortDate(isoDate: string): string {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('da-DK', {
    weekday: 'long', day: 'numeric', month: 'short',
  });
}

// ── File-type helpers ─────────────────────────────────────────────────────────

function getFileExt(title: string): string {
  const m = title.match(/\.([a-zA-Z0-9]{2,5})$/);
  return m ? m[1].toLowerCase() : '';
}

function FileItemLink({ item }: { item: CanvasModuleItem }) {
  const isLink = item.type === 'ExternalUrl' || item.type === 'Page';
  const ext = getFileExt(item.title);
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 py-1 group">
      {isLink
        ? <Link2 className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
        : <FileText className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />}
      <span className="text-xs truncate group-hover:underline" style={{ color: 'var(--text-secondary)' }}>{item.title}</span>
      {!isLink && ext && (
        <span className="font-mono text-[9px] font-bold uppercase shrink-0" style={{ color: 'var(--text-muted)' }}>{ext}</span>
      )}
    </a>
  );
}

function ModuleItemList({ module }: { module: CanvasModule }) {
  const items = module.items.filter((i) => i.type !== 'SubHeader' && i.url);
  if (items.length === 0) return null;
  return (
    <div>
      <p className="section-label mb-1.5">{module.name}</p>
      <div className="space-y-0.5">
        {items.map((item) => <FileItemLink key={item.id} item={item} />)}
      </div>
    </div>
  );
}

function CourseFileList({ docs }: { docs: Document[] }) {
  if (docs.length === 0) return null;
  return (
    <div>
      <p className="section-label mb-1.5">Filer</p>
      <div className="space-y-0.5">
        {docs.map((doc) => (
          <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 py-1 group">
            <FileText className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs truncate group-hover:underline" style={{ color: 'var(--text-secondary)' }}>{doc.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const { scheduleEvents, documents, courses, tasks, exams, canvasModules, groupMeetings, groupAssignments, currentUser, courseMapping, studyPages } = useApp();
  const [prepared, setPrepared] = useLocalStorage<Record<string, boolean>>('sg_today_prepared', {});
  const [viewingStudyPage, setViewingStudyPage] = useState<StudyPage | null>(null);
  const [fileErrorCourses, setFileErrorCourses] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CANVAS_FILE_ERRORS_KEY);
      if (!raw) return;
      const errors = JSON.parse(raw) as FileError[];
      setFileErrorCourses(new Set(errors.map((e) => e.courseId)));
    } catch { /* ignore */ }
  }, []);

  const today = new Date();
  const todayStr = localDateStr(today);

  const todayEvents = useMemo(() =>
    scheduleEvents
      .filter((e) => dateStr(e.start) === todayStr)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [scheduleEvents, todayStr]
  );

  const { nextDayStr, nextDayEvents } = useMemo(() => {
    const future = scheduleEvents
      .filter((e) => dateStr(e.start) > todayStr)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    if (future.length === 0) return { nextDayStr: null, nextDayEvents: [] };
    const nds = dateStr(future[0].start);
    return { nextDayStr: nds, nextDayEvents: future.filter((e) => dateStr(e.start) === nds) };
  }, [scheduleEvents, todayStr]);

  const kommendeGroups = useMemo(() => {
    if (todayEvents.length === 0) return [];
    const future = scheduleEvents
      .filter((e) => dateStr(e.start) > todayStr)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const uniqueDates: string[] = [];
    for (const e of future) {
      const d = dateStr(e.start);
      if (!uniqueDates.includes(d)) {
        uniqueDates.push(d);
        if (uniqueDates.length >= 2) break;
      }
    }
    return uniqueDates.map((d) => ({
      date: d,
      events: future.filter((e) => dateStr(e.start) === d),
    }));
  }, [scheduleEvents, todayEvents.length, todayStr]);

  const upcoming = useMemo(() => {
    const items: { id: string; title: string; date: string; courseId: string; kind: 'task' | 'exam'; overdue: boolean; url?: string }[] = [];
    tasks.forEach((t) => {
      if (t.status === 'done') return;
      const d = dateStr(t.deadline);
      if (!d) return;
      if (daysFromNow(d) > 7) return;
      items.push({ id: t.id, title: t.title, date: d, courseId: t.courseId, kind: 'task', overdue: d < todayStr, url: t.url });
    });
    exams.forEach((e) => {
      const d = dateStr(e.date);
      if (!d) return;
      if (daysFromNow(d) > 7) return;
      items.push({ id: e.id, title: e.title ?? e.courseName ?? 'Eksamen', date: d, courseId: e.courseId, kind: 'exam', overdue: d < todayStr });
    });
    return items.sort((a, b) => {
      if (a.overdue && !b.overdue) return -1;
      if (!a.overdue && b.overdue) return 1;
      return a.date.localeCompare(b.date);
    });
  }, [tasks, exams, todayStr]);

  function getResolvedCourse(eventTitle: string) {
    return resolveCourseForEvent(eventTitle, courses, courseMapping);
  }

  function getDocsForCourse(courseId: string): Document[] {
    return documents
      .filter((d) => d.courseId === courseId)
      .sort((a, b) => {
        if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
        const idA = parseInt(a.id.replace('canvas-file-', ''), 10) || 0;
        const idB = parseInt(b.id.replace('canvas-file-', ''), 10) || 0;
        return idB - idA;
      });
  }

  function togglePrepared(dayKey: string, eventId: string) {
    const key = `${dayKey}-${eventId}`;
    setPrepared((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function isPrepared(dayKey: string, eventId: string): boolean {
    return !!prepared[`${dayKey}-${eventId}`];
  }

  // ── Render a lesson row ────────────────────────────────────────────────────
  function renderLessonCard(event: ScheduleEvent, dayKey: string) {
    const course = getResolvedCourse(event.title);
    const hex = getCourseHex(course?.color, course?.id);
    const courseDocs = course ? getDocsForCourse(course.id) : [];
    const done = isPrepared(dayKey, event.id);
    const mappedModule = resolveModuleForEvent(event, course, scheduleEvents, canvasModules, courseMapping, courses);
    const hasExpandable = mappedModule !== null || courseDocs.length > 0;

    return (
      <li
        key={event.id}
        className={`bg-white transition-opacity ${done ? 'opacity-40' : ''}`}
        style={{
          border: '1px solid var(--border)',
          borderLeft: `4px solid ${hex}`,
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div className="px-4 pt-3 pb-2.5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Time + location in monospace */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                {fmtTime(event.start)}–{fmtTime(event.end)}
              </span>
              {event.location && (
                <>
                  <span style={{ color: 'var(--border)' }}>·</span>
                  <span className="font-mono text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {event.location}
                  </span>
                </>
              )}
            </div>
            {/* Course name in serif */}
            <p className="font-serif text-[17px] leading-snug" style={{ color: 'var(--text-primary)' }}>
              {course?.name ?? event.title}
            </p>
          </div>

          {/* Prepared checkbox */}
          <label className="shrink-0 flex items-center gap-1.5 cursor-pointer select-none mt-1">
            <input
              type="checkbox"
              className="check-custom"
              checked={done}
              onChange={() => togglePrepared(dayKey, event.id)}
            />
            {done && <span className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>Forberedt</span>}
          </label>
        </div>

        {(hasExpandable || (course && mappedModule)) && (
          <div className="px-4 pb-3 pt-0" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="pt-2.5 space-y-2">
              {mappedModule ? (
                <ModuleItemList module={mappedModule} />
              ) : courseDocs.length > 0 ? (
                <CourseFileList docs={courseDocs} />
              ) : null}
              {course && fileErrorCourses.has(course.id) && (
                <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--accent-error)' }}>
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  Filer ikke tilgængelige
                </p>
              )}
              {course && mappedModule && (
                <div className="pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                  <LessonNotes
                    courseId={course.id}
                    moduleId={mappedModule.id}
                    lessonTitle={event.title}
                    compact
                  />
                </div>
              )}
              {course && mappedModule && (() => {
                const sp = studyPages.find(p => p.courseId === course.id && p.moduleId === mappedModule.id);
                if (!sp) return null;
                return (
                  <button
                    onClick={() => setViewingStudyPage(sp)}
                    className="flex items-center gap-2 pt-1.5 text-xs font-medium transition-colors duration-fast hover:opacity-70"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    <BookMarked className="w-3 h-3" />
                    <span>{sp.title}</span>
                  </button>
                );
              })()}
            </div>
          </div>
        )}
      </li>
    );
  }

  // ── Header ────────────────────────────────────────────────────────────────
  const weekday = today.toLocaleDateString('da-DK', { weekday: 'long' });
  const dateLabel = today.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });

  const summaryParts: string[] = [];
  if (todayEvents.length > 0) {
    summaryParts.push(`${todayEvents.length} ${todayEvents.length === 1 ? 'lektion' : 'lektioner'}`);
  }
  const overdueCount = upcoming.filter((i) => i.overdue).length;
  const weekDeadlines = upcoming.filter((i) => !i.overdue).length;
  if (overdueCount > 0) summaryParts.push(`${overdueCount} overskreden${overdueCount !== 1 ? 'e' : ''}`);
  if (weekDeadlines > 0) summaryParts.push(`${weekDeadlines} deadline${weekDeadlines !== 1 ? 's' : ''} denne uge`);

  const noLessonsToday = todayEvents.length === 0;
  const hasSchedule = scheduleEvents.length > 0;

  // Group section
  const upcomingGroupMeeting = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 2); cutoff.setHours(23, 59, 59, 999);
    return groupMeetings
      .filter((m) => {
        const dt = new Date(`${m.date}T${m.endTime}:00`);
        return dt >= new Date() && dt <= cutoff;
      })
      .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime())[0] ?? null;
  }, [groupMeetings]);

  const myGroupTasks = useMemo(() => {
    if (!currentUser) return [];
    return groupAssignments
      .filter((a) => a.status === 'active')
      .flatMap((a) => a.tasks
        .filter((t) => t.assigneeId === currentUser.id && t.status !== 'done')
        .map((t) => ({ ...t, assignmentTitle: a.title, assignmentId: a.id }))
      )
      .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))
      .slice(0, 4);
  }, [groupAssignments, currentUser]);

  const nearestGroupAssignment = useMemo(
    () => groupAssignments.filter((a) => a.status === 'active').sort((a, b) => a.deadline.localeCompare(b.deadline))[0] ?? null,
    [groupAssignments]
  );

  return (
    <div className="max-w-[780px] mx-auto space-y-10">

      {/* ── Header — newspaper feel ── */}
      {noLessonsToday && nextDayStr ? (
        <div>
          <h1 className="font-serif text-[32px] leading-tight capitalize" style={{ color: 'var(--text-primary)' }}>
            Næste undervisningsdag
          </h1>
          <p className="font-mono text-sm mt-1 capitalize" style={{ color: 'var(--text-muted)' }}>
            {fmtLongDate(nextDayStr)}
          </p>
          {summaryParts.length > 0 && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {summaryParts.join(' · ')}
            </p>
          )}
        </div>
      ) : (
        <div>
          <h1 className="font-serif text-[36px] leading-tight capitalize" style={{ color: 'var(--text-primary)' }}>
            {weekday}
          </h1>
          <p className="font-mono text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {dateLabel}
          </p>
          {summaryParts.length > 0 && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {summaryParts.join(' · ')}
            </p>
          )}
        </div>
      )}

      {/* ── Today's lessons ── */}
      {todayEvents.length > 0 && (
        <section>
          <p className="section-label mb-3">I dag</p>
          <ul className="space-y-2">
            {todayEvents.map((event) => renderLessonCard(event, todayStr))}
          </ul>
        </section>
      )}

      {/* ── Next school day (full cards) ── */}
      {noLessonsToday && nextDayStr && nextDayEvents.length > 0 && (
        <section>
          <ul className="space-y-2">
            {nextDayEvents.map((event) => renderLessonCard(event, nextDayStr))}
          </ul>
        </section>
      )}

      {/* ── No schedule ── */}
      {noLessonsToday && !hasSchedule && (
        <section>
          <div
            className="bg-white px-5 py-10 text-center"
            style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Intet skema importeret</p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Brug <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Skema</span>-knappen i toppen for at importere din .ics-fil.
            </p>
          </div>
        </section>
      )}

      {/* ── No future events ── */}
      {noLessonsToday && hasSchedule && nextDayEvents.length === 0 && (
        <section>
          <div
            className="bg-white px-5 py-8 text-center"
            style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Ingen kommende undervisning</p>
          </div>
        </section>
      )}

      {/* ── Kommende — compact preview ── */}
      {kommendeGroups.length > 0 && (
        <section>
          <p className="section-label mb-3">Kommende</p>
          <div className="space-y-4">
            {kommendeGroups.map(({ date, events }) => {
              const dayLabel = fmtShortDate(date);
              return (
                <div key={date}>
                  <p className="font-mono text-xs font-medium capitalize mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    {dayLabel}
                  </p>
                  <ul className="space-y-1">
                    {events.map((event) => {
                      const course = getResolvedCourse(event.title);
                      const hex = getCourseHex(course?.color, course?.id);
                      return (
                        <li
                          key={event.id}
                          className="flex items-center gap-3 bg-white px-3.5 py-2"
                          style={{
                            border: '1px solid var(--border)',
                            borderLeft: `4px solid ${hex}`,
                            borderRadius: 'var(--radius-md)',
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                              {course?.name ?? event.title}
                            </p>
                            {event.location && (
                              <p className="font-mono text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{event.location}</p>
                            )}
                          </div>
                          <span className="font-mono text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                            {fmtTime(event.start)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Studiegruppe section ── */}
      {(upcomingGroupMeeting || myGroupTasks.length > 0) && (
        <section>
          <p className="section-label mb-3">Studiegruppe</p>
          <div className="space-y-2">

            {/* Next group meeting — dashed border */}
            {upcomingGroupMeeting && (
              <div
                className="bg-white px-4 py-3"
                style={{
                  border: '1px dashed var(--border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 flex items-center justify-center shrink-0 mt-0.5"
                    style={{ borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)' }}
                  >
                    <Calendar className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="section-label mb-0.5">Gruppemøde</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{upcomingGroupMeeting.title}</p>
                    {upcomingGroupMeeting.timePoll ? (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--accent-primary)' }}>Afstemning igangværende</p>
                    ) : (
                      <div className="flex items-center gap-3 mt-0.5 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="capitalize">{fmtLongDate(upcomingGroupMeeting.date)}</span>
                        <span>{upcomingGroupMeeting.startTime}–{upcomingGroupMeeting.endTime}</span>
                        {upcomingGroupMeeting.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{upcomingGroupMeeting.location}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* My group tasks */}
            {myGroupTasks.length > 0 && (
              <div className="space-y-1">
                {myGroupTasks.map((task) => {
                  const days = task.deadline ? daysFromNow(task.deadline) : null;
                  const urgent = days !== null && days <= 2;
                  return (
                    <div
                      key={task.id}
                      className="bg-white px-3.5 py-2.5 flex items-center gap-3"
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <Users className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{task.assignmentTitle}</p>
                      </div>
                      {task.deadline && (
                        <span
                          className="font-mono text-xs font-medium shrink-0"
                          style={{ color: urgent ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                        >
                          {days === 0 ? 'I dag' : days === 1 ? 'I morgen' : `${days}d`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Nearest assignment progress — segmented indicator */}
            {nearestGroupAssignment && (() => {
              const doneCount = nearestGroupAssignment.tasks.filter((t) => t.status === 'done').length;
              const total = nearestGroupAssignment.tasks.length;
              if (total === 0) return null;
              const days = daysFromNow(nearestGroupAssignment.deadline);
              return (
                <div
                  className="bg-white px-3.5 py-2.5"
                  style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                      {nearestGroupAssignment.title}
                    </p>
                    <span
                      className="font-mono text-xs font-semibold shrink-0 ml-3"
                      style={{
                        color: days < 0 ? 'var(--accent-error)' : days <= 2 ? 'var(--accent-primary)' : 'var(--text-muted)',
                      }}
                    >
                      {days < 0 ? `${Math.abs(days)}d over` : days === 0 ? 'I dag' : days === 1 ? 'I morgen' : `Om ${days}d`}
                    </span>
                  </div>
                  {/* Segmented progress */}
                  <div className="flex items-center gap-1">
                    {nearestGroupAssignment.tasks.map((t, i) => (
                      <div
                        key={i}
                        className="h-2 flex-1 transition-colors"
                        style={{
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: t.status === 'done' ? 'var(--accent-primary)' : 'var(--border)',
                        }}
                      />
                    ))}
                  </div>
                  <p className="font-mono text-[10px] mt-1 text-right" style={{ color: 'var(--text-muted)' }}>
                    {doneCount} af {total}
                  </p>
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* Study page viewer */}
      {viewingStudyPage && (
        <StudyPageViewer
          page={viewingStudyPage}
          courseName={courses.find(c => c.id === viewingStudyPage.courseId)?.name ?? ''}
          onClose={() => setViewingStudyPage(null)}
        />
      )}

      {/* ── Upcoming deadlines ── */}
      {upcoming.length > 0 && (
        <section>
          <p className="section-label mb-3">Kommende deadlines</p>
          <ul className="space-y-1.5">
            {upcoming.map((item) => {
              const course = courses.find((c) => c.id === item.courseId);
              const hex = getCourseHex(course?.color, course?.id);
              const days = daysFromNow(item.date);
              const isToday = days === 0;
              const isTomorrow = days === 1;
              const dayLabel = item.overdue
                ? `${Math.abs(days)}d over`
                : isToday ? 'I dag'
                : isTomorrow ? 'I morgen'
                : `Om ${days} dage`;

              return (
                <li
                  key={item.id}
                  className="bg-white px-4 py-2.5 flex items-center justify-between gap-4"
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.overdue ? 'var(--accent-error)' : hex }}
                    />
                    <div className="min-w-0">
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-medium truncate flex items-center gap-1 hover:underline"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {item.title}
                          <ExternalLink className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                        </a>
                      ) : (
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {item.title}
                        </p>
                      )}
                      {course && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{course.name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.kind === 'exam' && <BookOpen className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />}
                    <span
                      className="font-mono text-xs font-semibold"
                      style={{
                        color: item.overdue ? 'var(--accent-error)'
                          : isToday ? 'var(--accent-primary)'
                          : isTomorrow ? 'var(--accent-primary)'
                          : 'var(--text-muted)',
                      }}
                    >
                      {dayLabel}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
