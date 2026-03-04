'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { getCourseColor } from '@/lib/courseColors';
import {
  ChevronLeft, ChevronRight, BookOpen, CheckSquare,
  Clock, MapPin, X, ExternalLink, FileText, NotebookText,
} from 'lucide-react';
import type { Task, Exam, ScheduleEvent, Course, Document, StudyNote, CanvasModule } from '@/types';

const HOUR_H = 64;
const DAY_START = 8;
const DAY_END = 18;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
}

function minutesFromMidnight(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function isoWeekKey(date: Date): string {
  return `${date.getFullYear()}-${String(getISOWeek(date)).padStart(2, '0')}`;
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

// ── Types ─────────────────────────────────────────────────────────────────────

type Selected =
  | { kind: 'task'; data: Task }
  | { kind: 'exam'; data: Exam }
  | { kind: 'sched'; data: ScheduleEvent; matchedCourse?: Course; weekKey: string };

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { tasks, exams, scheduleEvents, courses, documents, notes, canvasModules } = useApp();
  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(today));
  const [selected, setSelected] = useState<Selected | null>(null);

  const eventCourseMap = useMemo(() => {
    const map = new Map<string, Course | undefined>();
    for (const ev of scheduleEvents) map.set(ev.id, matchEventToCourse(ev.title, courses));
    return map;
  }, [scheduleEvents, courses]);

  const days = useMemo(() => {
    const base = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
    });
    const sat = new Date(weekStart); sat.setDate(sat.getDate() + 5);
    const sun = new Date(weekStart); sun.setDate(sun.getDate() + 6);
    const hasWeekend = scheduleEvents.some((s) => {
      const d = new Date(s.start);
      return sameDay(d, sat) || sameDay(d, sun);
    });
    return hasWeekend ? [...base, sat, sun] : base;
  }, [weekStart, scheduleEvents]);

  function scheduledFor(day: Date) {
    return scheduleEvents
      .filter((s) => sameDay(new Date(s.start), day))
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  const hours = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);
  const gridH = (DAY_END - DAY_START) * HOUR_H;
  const weekNum = getISOWeek(weekStart);
  const isCurrent = sameDay(weekStart, getMondayOf(today));

  function prevWeek() {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  }
  function nextWeek() {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center gap-1">
        <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1 className="text-base font-bold text-gray-900 w-36 text-center tabular-nums">
          Uge {weekNum} · {weekStart.getFullYear()}
        </h1>
        <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
        {!isCurrent && (
          <button onClick={() => setWeekStart(getMondayOf(today))}
            className="ml-2 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            Denne uge
          </button>
        )}
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
        <div style={{ minWidth: days.length * 130 + 56 }}>

          {/* Day headers */}
          <div className="grid border-b border-gray-100"
            style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, 1fr)` }}>
            <div className="border-r border-gray-50" />
            {days.map((day, i) => {
              const isToday = sameDay(day, today);
              return (
                <div key={i} className={`py-3 text-center border-l border-gray-100 ${isToday ? 'bg-blue-50' : ''}`}>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                    {day.toLocaleDateString('da-DK', { weekday: 'short' })}
                  </p>
                  <p className={`text-2xl font-bold leading-none mt-0.5 ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                    {day.getDate()}
                  </p>
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    {day.toLocaleDateString('da-DK', { month: 'short' })}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          {scheduleEvents.length > 0 ? (
            <div className="grid relative"
              style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, 1fr)`, height: gridH }}>

              {/* Hour labels */}
              <div className="relative border-r border-gray-50">
                {hours.map((h, idx) => (
                  <div key={h} className="absolute w-full flex items-start justify-end pr-2"
                    style={{ top: idx * HOUR_H, height: HOUR_H }}>
                    <span className="text-[10px] text-gray-300 tabular-nums mt-1 leading-none">
                      {String(h).padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map((day, ci) => {
                const isToday = sameDay(day, today);
                const evs = scheduledFor(day);
                const wk = isoWeekKey(day);
                return (
                  <div key={ci} className={`relative border-l border-gray-100 ${isToday ? 'bg-blue-50/20' : ''}`}>
                    {hours.map((_, idx) => (
                      <div key={idx} className="absolute w-full border-t border-gray-50"
                        style={{ top: idx * HOUR_H }} />
                    ))}

                    {evs.map((ev) => {
                      const matched = eventCourseMap.get(ev.id);
                      const colors = getCourseColor(matched?.color, matched?.id ?? ev.id);
                      const startM = minutesFromMidnight(ev.start);
                      const endM = minutesFromMidnight(ev.end);
                      const top = Math.max(0, (startM - DAY_START * 60) / 60 * HOUR_H);
                      const height = Math.max(20, (endM - startM) / 60 * HOUR_H);
                      return (
                        <button key={ev.id}
                          onClick={() => setSelected({ kind: 'sched', data: ev, matchedCourse: matched, weekKey: wk })}
                          className={`absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 text-left overflow-hidden transition-all z-[1] border ${colors.light} ${colors.border} hover:opacity-90 hover:shadow-sm`}
                          style={{ top, height }}>
                          <p className={`text-[10px] font-semibold truncate leading-tight ${colors.text}`}>{ev.title}</p>
                          {height > 34 && ev.location && (
                            <p className={`text-[9px] truncate opacity-70 ${colors.text}`}>{ev.location}</p>
                          )}
                          {height > 48 && (
                            <p className={`text-[9px] tabular-nums opacity-60 ${colors.text}`}>
                              {fmtTime(ev.start)}–{fmtTime(ev.end)}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-14 text-gray-400">
              <Clock className="w-4 h-4 opacity-50" />
              <span className="text-sm">Importer dit skema via "Skema"-knappen i topbaren</span>
            </div>
          )}
        </div>
      </div>

      {/* Detail overlay */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/10 backdrop-blur-sm"
          onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <DetailPanel
              selected={selected}
              courseMap={courseMap}
              documents={documents}
              notes={notes}
              canvasModules={canvasModules}
              tasks={tasks}
              exams={exams}
              onClose={() => setSelected(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ selected, courseMap, documents, notes, canvasModules, tasks, exams, onClose }: {
  selected: Selected;
  courseMap: Map<string, Course>;
  documents: Document[];
  notes: StudyNote[];
  canvasModules: CanvasModule[];
  tasks: Task[];
  exams: Exam[];
  onClose: () => void;
}) {
  const closeBtn = (
    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
      <X className="w-4 h-4" />
    </button>
  );

  if (selected.kind === 'sched') {
    const ev = selected.data;
    const course = selected.matchedCourse;
    const colors = getCourseColor(course?.color, course?.id ?? ev.id);

    // Study notes for this week
    const courseNotes = course ? notes.filter((n) => n.courseId === course.id) : [];
    const shownNotes = courseNotes.filter((n) => n.week === selected.weekKey);

    // Canvas modules for this course — always show all, user picks the right one
    const courseModules = course
      ? canvasModules.filter((m) => m.courseId === course.id).sort((a, b) => a.position - b.position)
      : [];

    const hasContent = shownNotes.length > 0 || courseModules.length > 0;

    return (
      <>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 ${course ? colors.light : 'bg-gray-50'} rounded-lg`}>
              <Clock className={`w-4 h-4 ${course ? colors.text : 'text-gray-400'}`} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Undervisning</span>
              {course && <p className={`text-xs font-semibold leading-tight ${colors.text}`}>{course.name}</p>}
            </div>
          </div>
          {closeBtn}
        </div>

        <h2 className="font-bold text-gray-900 leading-snug mb-3 text-sm">{ev.title}</h2>

        <div className="space-y-1.5 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="tabular-nums text-sm">{fmtTime(ev.start)} – {fmtTime(ev.end)}</span>
          </div>
          {ev.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-sm">{ev.location}</span>
            </div>
          )}
        </div>

        {hasContent && <div className="border-t border-gray-50 pt-4 space-y-4">

          {/* Study notes for this week */}
          {shownNotes.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Studienoter · uge</p>
              <div className="space-y-1">
                {shownNotes.map((n) => (
                  <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
                    <NotebookText className="w-3.5 h-3.5 text-gray-300 shrink-0 group-hover:text-gray-500" />
                    <span className="text-xs text-gray-700 truncate flex-1">{n.title}</span>
                    <span className="text-[10px] text-gray-300 shrink-0 uppercase">{n.format}</span>
                    <ExternalLink className="w-3 h-3 text-gray-200 shrink-0 group-hover:text-blue-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Canvas modules — all of them, user picks the right one */}
          {courseModules.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Canvas moduler</p>
              <div className="space-y-0.5">
                {courseModules.map((mod) => (
                  <details key={mod.id}>
                    <summary className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-xs text-gray-700 font-medium list-none select-none">
                      <span className="truncate flex-1">{mod.name}</span>
                      {mod.items.length > 0 && <span className="text-[10px] text-gray-300 shrink-0 tabular-nums">{mod.items.length}</span>}
                    </summary>
                    <div className="mb-1 space-y-0.5 pl-2">
                      {mod.items.map((item) => (
                        <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group">
                          <FileText className="w-3 h-3 text-gray-300 shrink-0 group-hover:text-gray-500" />
                          <span className="text-xs text-gray-600 truncate flex-1">{item.title}</span>
                          <ExternalLink className="w-3 h-3 text-gray-200 shrink-0 group-hover:text-blue-400" />
                        </a>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>}

        {!hasContent && course && (
          <p className="text-xs text-gray-300 italic">Ingen dokumenter fundet for {course.name}. Kør Canvas sync.</p>
        )}
        {!course && (
          <p className="text-[10px] text-gray-300 italic">
            Ingen fagmatch — stemmer kursusnavnet overens med et fag i appen?
          </p>
        )}
      </>
    );
  }

  if (selected.kind === 'exam') {
    const exam = selected.data;
    const course = courseMap.get(exam.courseId);
    const colors = getCourseColor(course?.color, exam.courseId);
    const topics = exam.topics ?? [];
    const done = topics.filter((t) => t.done).length;
    return (
      <>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 ${colors.light} rounded-lg`}>
              <BookOpen className={`w-4 h-4 ${colors.text}`} />
            </div>
            <span className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}>Eksamen</span>
          </div>
          {closeBtn}
        </div>
        <h2 className="font-bold text-gray-900 leading-snug">{course?.name ?? exam.courseName ?? 'Eksamen'}</h2>
        {exam.title && <p className="text-sm text-gray-500 mt-0.5">{exam.title}</p>}
        <p className="text-sm text-gray-500 mt-1">
          {new Date(exam.date).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        {topics.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            <p className="text-xs font-semibold text-gray-500 mb-2">{done}/{topics.length} emner dækket</p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {topics.map((t) => (
                <div key={t.id} className="flex items-start gap-2 text-sm">
                  <span className={`text-xs mt-0.5 shrink-0 ${t.done ? 'text-green-400' : 'text-gray-200'}`}>●</span>
                  <span className={t.done ? 'text-gray-400 line-through' : 'text-gray-700'}>{t.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  if (selected.kind === 'task') {
    const task = selected.data;
    const course = courseMap.get(task.courseId);
    const colors = getCourseColor(course?.color, task.courseId);
    const isOverdue = new Date(task.deadline) < new Date();
    return (
      <>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 ${colors.light} rounded-lg`}>
              <CheckSquare className={`w-4 h-4 ${colors.text}`} />
            </div>
            <span className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}>Aflevering</span>
          </div>
          {closeBtn}
        </div>
        <h2 className="font-bold text-gray-900 leading-snug">{task.title}</h2>
        {course && <p className="text-sm text-gray-500 mt-0.5">{course.name}</p>}
        <p className={`text-sm mt-1 font-medium ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
          {isOverdue ? 'Overskredet · ' : ''}
          {new Date(task.deadline).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        {task.url && (
          <a href={task.url} target="_blank" rel="noopener noreferrer"
            className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
            Åbn opgave
          </a>
        )}
      </>
    );
  }

  return null;
}
