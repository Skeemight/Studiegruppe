'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { NoteCard } from '@/components/notes/NoteCard';
import { Card } from '@/components/ui/Card';
import { getCourseColor, getCourseHex } from '@/lib/courseColors';
import { CANVAS_FILE_ERRORS_KEY, type FileError } from '@/lib/canvasApi';
import { getISOWeek, buildLessonNumberMap, getCourseModules, eventMatchesCourse } from '@/lib/courseUtils';
import {
  ArrowLeft, BookOpen, ExternalLink, Trash2,
  Search, X, ChevronDown, FileText, Link2, Info, Pencil, StickyNote, BookMarked,
} from 'lucide-react';
import { EditCourseModal } from '@/components/fag/EditCourseModal';
import { LessonNotes } from '@/components/lesson-notes/LessonNotes';
import { StudyPageModal } from '@/components/study-pages/StudyPageModal';
import { StudyPageViewer } from '@/components/study-pages/StudyPageViewer';
import { MarkdownContent } from '@/lib/markdownLite';
import type { Task, TaskStatus, CanvasModuleItem, Course, StudyPage } from '@/types';

// ── Task helpers ───────────────────────────────────────────────────────────────

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress', in_progress: 'done', done: 'todo',
};
const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Aktiv', in_progress: 'I gang', done: 'Færdig',
};
const STATUS_STYLE: Record<TaskStatus, { bg: string; text: string }> = {
  todo:        { bg: 'var(--border)', text: 'var(--text-secondary)' },
  in_progress: { bg: 'var(--accent-primary)', text: '#fff' },
  done:        { bg: 'var(--accent-secondary)', text: '#fff' },
};

// ── File-type helpers ──────────────────────────────────────────────────────────

function getFileExt(title: string): string {
  const m = title.match(/\.([a-zA-Z0-9]{2,5})$/);
  return m ? m[1].toLowerCase() : '';
}

const EXT_BADGE: Record<string, { label: string; cls: string }> = {
  pdf:  { label: 'PDF',  cls: 'text-red-600 bg-red-50' },
  pptx: { label: 'PPTX', cls: 'text-orange-600 bg-orange-50' },
  ppt:  { label: 'PPT',  cls: 'text-orange-600 bg-orange-50' },
  docx: { label: 'DOCX', cls: 'text-blue-600 bg-blue-50' },
  doc:  { label: 'DOC',  cls: 'text-blue-600 bg-blue-50' },
  xlsx: { label: 'XLSX', cls: 'text-emerald-600 bg-emerald-50' },
  xls:  { label: 'XLS',  cls: 'text-emerald-600 bg-emerald-50' },
};

function getTypeBadge(item: CanvasModuleItem) {
  if (item.type === 'ExternalUrl' || item.type === 'Page')
    return { label: 'LINK', cls: '' };
  const ext = getFileExt(item.title);
  return EXT_BADGE[ext] ?? { label: ext.toUpperCase() || 'FIL', cls: '' };
}

type ContentTag = 'slides' | 'exercise' | 'reading';

function getContentTag(title: string): ContentTag | null {
  const l = title.toLowerCase();
  if (l.includes('slide') || l.includes('lecture') || l.includes('forel')) return 'slides';
  if (l.includes('exercise') || l.includes('opgave') || l.includes('assignment') || l.includes('handout')) return 'exercise';
  if (l.includes('reading') || l.includes('chapter') || l.includes('kapitel') || l.includes('læse')) return 'reading';
  return null;
}

const CONTENT_BADGE: Record<ContentTag, { label: string }> = {
  slides:   { label: 'Slides' },
  exercise: { label: 'Opgave' },
  reading:  { label: 'Læse' },
};

// ── Filter config ──────────────────────────────────────────────────────────────

type FilterMode = 'alle' | 'pdf' | 'pptx' | 'slides' | 'exercise';

const FILTERS: { key: FilterMode; label: string }[] = [
  { key: 'alle',     label: 'Alle' },
  { key: 'pdf',      label: 'PDF' },
  { key: 'pptx',     label: 'PPTX' },
  { key: 'slides',   label: 'Slides' },
  { key: 'exercise', label: 'Opgaver' },
];

function matchesFilter(item: CanvasModuleItem, filter: FilterMode): boolean {
  if (filter === 'alle') return true;
  const ext = getFileExt(item.title);
  if (filter === 'pdf')      return ext === 'pdf';
  if (filter === 'pptx')     return ext === 'pptx' || ext === 'ppt';
  if (filter === 'slides')   return getContentTag(item.title) === 'slides';
  if (filter === 'exercise') return getContentTag(item.title) === 'exercise';
  return true;
}

// ── TaskRow ────────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: Task }) {
  const { updateTask, deleteTask } = useApp();
  const deadline = new Date(task.deadline);
  const isOverdue = deadline < new Date() && task.status !== 'done';
  const st = STATUS_STYLE[task.status];
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex-1 min-w-0">
        {task.url ? (
          <a href={task.url} target="_blank" rel="noopener noreferrer"
            className="text-sm font-medium flex items-center gap-1 hover:underline"
            style={{ color: 'var(--text-primary)' }}
          >
            {task.title} <ExternalLink className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
          </a>
        ) : (
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
        )}
        {task.assignedTo && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{task.assignedTo}</p>}
      </div>
      <span className="font-mono text-xs font-medium shrink-0" style={{ color: isOverdue ? 'var(--accent-error)' : 'var(--text-muted)' }}>
        {isOverdue ? '! ' : ''}{deadline.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
      </span>
      <button onClick={() => updateTask(task.id, { status: NEXT_STATUS[task.status] })}
        className="text-xs px-2 py-0.5 font-medium shrink-0 transition-colors hover:opacity-80"
        style={{ backgroundColor: st.bg, color: st.text, borderRadius: 'var(--radius-sm)' }}
      >
        {STATUS_LABEL[task.status]}
      </button>
      <button onClick={() => deleteTask(task.id)}
        className="p-1 transition-colors rounded shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── FileRow ────────────────────────────────────────────────────────────────────

function FileRow({ item, meta }: { item: CanvasModuleItem; meta?: string }) {
  const badge = getTypeBadge(item);
  const contentTag = getContentTag(item.title);
  const isLink = item.type === 'ExternalUrl' || item.type === 'Page';
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-2.5 transition-colors group"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {isLink
        ? <Link2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
        : <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />}
      <span className="flex-1 min-w-0">
        <span className="text-sm truncate block group-hover:underline" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
        {meta && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{meta}</span>}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        {contentTag && (
          <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
            {CONTENT_BADGE[contentTag].label}
          </span>
        )}
        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
          {badge.label}
        </span>
      </div>
      <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
    </a>
  );
}

// ── ModuleGroup — editorial numbered layout ──────────────────────────────────

function ModuleGroup({ module, lessonNumber, lessonDate, defaultOpen, items, courseId, studyPage, onAddStudyPage, onViewStudyPage }: {
  module: { id: string; name: string };
  lessonNumber: number | null;
  lessonDate: Date | null;
  defaultOpen: boolean;
  items: CanvasModuleItem[];
  courseId: string;
  studyPage?: StudyPage;
  onAddStudyPage: () => void;
  onViewStudyPage: (page: StudyPage) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const dateLabel = lessonDate
    ? lessonDate.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'short' })
    : null;

  const headline = lessonNumber !== null
    ? `Lektion ${lessonNumber}${dateLabel ? ` · ${dateLabel}` : ''}`
    : (dateLabel ?? module.name);

  const subtitle = lessonNumber !== null ? module.name : null;
  const lessonTitle = headline + (subtitle ? ` — ${subtitle}` : '');

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 px-4 py-3.5 transition-colors text-left hover:opacity-80">
        {/* Lesson number in large serif */}
        {lessonNumber !== null && (
          <span className="font-serif text-2xl w-8 text-right shrink-0" style={{ color: 'var(--border-hover)', lineHeight: 1 }}>
            {String(lessonNumber).padStart(2, '0')}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {lessonNumber !== null ? (dateLabel ?? module.name) : headline}
          </p>
          {subtitle && <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {studyPage && (
            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent-primary)', borderRadius: 'var(--radius-sm)' }}>
              Studieside
            </span>
          )}
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{items.length}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${open ? '' : '-rotate-90'}`} style={{ color: 'var(--text-muted)' }} />
        </div>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {/* Study page link / add */}
          {studyPage ? (
            <button
              onClick={() => onViewStudyPage(studyPage)}
              className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left hover:opacity-80"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <BookMarked className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
              <span className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block" style={{ color: 'var(--accent-primary)' }}>{studyPage.title}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>af {studyPage.createdByName}</span>
              </span>
            </button>
          ) : (
            <button
              onClick={onAddStudyPage}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs transition-colors hover:opacity-70"
              style={{ color: 'var(--accent-primary)', borderBottom: '1px solid var(--border)' }}
            >
              <BookMarked className="w-3 h-3" />
              Tilføj studieside
            </button>
          )}

          {items.length === 0
            ? <p className="px-4 py-3 text-xs italic" style={{ color: 'var(--text-muted)' }}>Ingen dokumenter uploadet endnu.</p>
            : items.map(item => <FileRow key={item.id} item={item} />)
          }
          {/* Lesson notes */}
          <div className="px-4 pb-3.5 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <LessonNotes courseId={courseId} moduleId={module.id} lessonTitle={lessonTitle} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const { courses, tasks, notes, exams, canvasModules, scheduleEvents, documents, lessonNotes, courseMapping, studyPages } = useApp();
  const [hasFileError, setHasFileError] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterMode>('alle');
  const [showEdit, setShowEdit] = useState(false);
  const [materialsView, setMaterialsView] = useState<'moduler' | 'noter' | 'studiesider'>('moduler');
  const [noteSearch, setNoteSearch] = useState('');
  const [studyPageModal, setStudyPageModal] = useState<{ moduleId: string; moduleName: string; weekNumber?: number } | null>(null);
  const [viewingStudyPage, setViewingStudyPage] = useState<StudyPage | null>(null);
  const [editingStudyPage, setEditingStudyPage] = useState<StudyPage | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CANVAS_FILE_ERRORS_KEY);
      if (!raw) return;
      const errors = JSON.parse(raw) as FileError[];
      setHasFileError(errors.some(e => e.courseId === id));
    } catch { /* ignore */ }
  }, [id]);

  const courseDocuments = useMemo(() =>
    documents
      .filter(d => d.courseId === id)
      .sort((a, b) => {
        if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
        return 0;
      }),
    [documents, id]
  );

  const lessonNumberByDate = useMemo(
    () => buildLessonNumberMap(id, scheduleEvents, courseMapping, courses),
    [id, scheduleEvents, courseMapping, courses],
  );

  const moduleGroups = useMemo(() => {
    const sortedModules = getCourseModules(id, canvasModules);
    const lessonEntries = Array.from(lessonNumberByDate.entries()).sort((a, b) => a[1] - b[1]);

    const real = sortedModules.map((m, posIdx) => {
      let date: Date | null = null;
      let lessonNumber: number | null = null;

      if (m.week != null) {
        const weekLesson = scheduleEvents
          .filter(e => eventMatchesCourse(e.title, id, courseMapping, courses))
          .find(e => getISOWeek(new Date(e.start)) === m.week);
        if (weekLesson) {
          date = new Date(weekLesson.start);
          lessonNumber = lessonNumberByDate.get(weekLesson.start.slice(0, 10)) ?? null;
        }
      }

      if (!date) {
        const entry = lessonEntries[posIdx];
        if (entry) {
          date = new Date(entry[0] + 'T12:00:00');
          lessonNumber = entry[1];
        }
      }

      return { module: m, date, lessonNumber };
    })
      .sort((a, b) => {
        if (a.date && b.date) return b.date.getTime() - a.date.getTime();
        if (a.date) return -1;
        if (b.date) return 1;
        return b.module.position - a.module.position;
      });

    if (real.length === 0 && courseDocuments.length > 0) {
      return [{
        module: {
          id: '__flat_docs__',
          courseId: id,
          name: 'Kursusfiler',
          position: 0,
          week: null,
          items: courseDocuments.map(d => ({ id: d.id, title: d.title, url: d.url, type: 'File' })),
        },
        date: null,
        lessonNumber: null,
      }];
    }

    return real;
  }, [canvasModules, id, scheduleEvents, lessonNumberByDate, courseDocuments, courses, courseMapping]);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase().trim();
    const noFilter = !q && typeFilter === 'alle';
    return moduleGroups.map(({ module, date, lessonNumber }) => {
      const items = module.items
        .filter(i => i.type !== 'SubHeader' && i.url)
        .filter(i => matchesFilter(i, typeFilter))
        .filter(i => !q || i.title.toLowerCase().includes(q));
      return { module, date, lessonNumber, items };
    }).filter(g => g.items.length > 0 || noFilter);
  }, [moduleGroups, search, typeFilter]);

  const recentItems = useMemo(() => {
    const result: { item: CanvasModuleItem; moduleName: string }[] = [];
    for (const { module } of moduleGroups.slice(0, 2)) {
      for (const item of module.items.filter(i => i.type !== 'SubHeader' && i.url).slice(0, 3)) {
        if (result.length >= 5) break;
        result.push({ item, moduleName: module.name });
      }
      if (result.length >= 5) break;
    }
    return result;
  }, [moduleGroups]);

  const hasModules = moduleGroups.length > 0;
  const isFiltering = search.trim().length > 0 || typeFilter !== 'alle';

  const courseStudyPages = useMemo(() =>
    studyPages.filter(sp => sp.courseId === id),
    [studyPages, id]
  );
  const studyPageByModule = useMemo(() => {
    const map = new Map<string, StudyPage>();
    courseStudyPages.forEach(sp => map.set(sp.moduleId, sp));
    return map;
  }, [courseStudyPages]);

  const courseTasks = tasks
    .filter(t => t.courseId === id)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  const courseNotes = notes.filter(n => n.courseId === id);

  const courseExam = exams
    .filter(e => e.courseId === id && new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const now = new Date();
  const endOfWeek = new Date(now); endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  const endOfNextWeek = new Date(endOfWeek); endOfNextWeek.setDate(endOfWeek.getDate() + 7);

  const taskGroups = [
    { label: 'Overskredet', color: 'var(--accent-error)',     tasks: courseTasks.filter(t => t.status !== 'done' && new Date(t.deadline) < now) },
    { label: 'Denne uge',   color: 'var(--text-primary)',     tasks: courseTasks.filter(t => t.status !== 'done' && new Date(t.deadline) >= now && new Date(t.deadline) <= endOfWeek) },
    { label: 'Næste uge',   color: 'var(--text-primary)',     tasks: courseTasks.filter(t => t.status !== 'done' && new Date(t.deadline) > endOfWeek && new Date(t.deadline) <= endOfNextWeek) },
    { label: 'Senere',      color: 'var(--text-secondary)',   tasks: courseTasks.filter(t => t.status !== 'done' && new Date(t.deadline) > endOfNextWeek) },
    { label: 'Færdig',      color: 'var(--accent-secondary)', tasks: courseTasks.filter(t => t.status === 'done') },
  ].filter(g => g.tasks.length > 0);

  const daysUntilExam = courseExam
    ? Math.ceil((new Date(courseExam.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const notesByWeek = courseNotes.reduce<Record<string, typeof courseNotes>>((acc, note) => {
    if (!acc[note.week]) acc[note.week] = [];
    acc[note.week].push(note);
    return acc;
  }, {});
  const sortedWeeks = Object.keys(notesByWeek).sort((a, b) => {
    const aM = a.match(/\d+/), bM = b.match(/\d+/);
    if (aM && bM) return Number(aM[0]) - Number(bM[0]);
    return a.localeCompare(b, 'da');
  });

  const course = courses.find(c => c.id === id);
  const hex = getCourseHex(course?.color, course?.id);

  if (!course) {
    return (
      <div className="max-w-[780px] mx-auto text-center py-20" style={{ color: 'var(--text-muted)' }}>
        <p className="text-lg font-medium">Fag ikke fundet</p>
        <Link href="/fag" className="text-sm mt-2 block hover:underline" style={{ color: 'var(--accent-primary)' }}>← Tilbage til fag</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[780px] mx-auto">
      {/* Header */}
      <div>
        <Link href="/fag" className="inline-flex items-center gap-1 text-xs mb-4 hover:underline" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft className="w-3 h-3" /> Alle fag
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-[28px] leading-tight" style={{ color: 'var(--text-primary)' }}>
            {course.name}
          </h1>
          <button
            onClick={() => setShowEdit(true)}
            title="Rediger fag"
            className="p-1.5 rounded transition-colors duration-fast"
            style={{ color: 'var(--text-muted)' }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Color underline */}
        <div className="h-[3px] w-12 mt-2" style={{ backgroundColor: hex, borderRadius: 2 }} />
        {course.semester && <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{course.semester}</p>}
      </div>

      {showEdit && <EditCourseModal course={course} onClose={() => setShowEdit(false)} />}

      {/* Exam banner */}
      {courseExam && (
        <div
          className="bg-white px-5 py-4 flex items-center justify-between gap-4"
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <div>
              <p className="section-label mb-0.5">Eksamen</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {new Date(courseExam.date).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {courseExam.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{courseExam.notes}</p>}
            </div>
          </div>
          {daysUntilExam !== null && daysUntilExam >= 0 && (
            <div className="text-right shrink-0">
              <p className="font-mono text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{daysUntilExam}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>dage</p>
            </div>
          )}
        </div>
      )}

      {/* Tasks */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="section-label">Afleveringer</p>
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            {courseTasks.filter(t => t.status !== 'done').length} åbne
          </span>
        </div>
        <div className="bg-white" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          {courseTasks.length === 0 ? (
            <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--text-muted)' }}>Ingen afleveringer endnu.</p>
          ) : (
            <div className="px-5">
              {taskGroups.map(group => (
                <div key={group.label}>
                  <p className="section-label pt-4 pb-1" style={{ color: group.color }}>{group.label}</p>
                  {group.tasks.map(task => <TaskRow key={task.id} task={task} />)}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Materialer */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 p-0.5" style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
            {(['moduler', 'noter', 'studiesider'] as const).map(tab => {
              const active = materialsView === tab;
              const labels = { moduler: 'Moduler', noter: 'Alle noter', studiesider: 'Studiesider' };
              const icons = { moduler: null, noter: StickyNote, studiesider: BookMarked };
              const Icon = icons[tab];
              const count = tab === 'noter'
                ? lessonNotes.filter(n => n.courseId === id).length
                : tab === 'studiesider'
                ? courseStudyPages.length
                : 0;
              return (
                <button
                  key={tab}
                  onClick={() => setMaterialsView(tab)}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium transition-colors"
                  style={{
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: active ? 'white' : 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {labels[tab]}
                  {count > 0 && (
                    <span className="ml-0.5 font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {hasModules && materialsView === 'moduler' && (
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              {moduleGroups.reduce((sum, g) => sum + g.module.items.filter(i => i.type !== 'SubHeader' && i.url).length, 0)} filer
            </span>
          )}
        </div>

        {hasFileError && materialsView === 'moduler' && (
          <div className="flex items-start gap-2.5 px-4 py-3 text-sm" style={{ backgroundColor: '#FEF3E3', border: '1px solid #F0DCC0', borderRadius: 'var(--radius-md)', color: '#8B6E3D' }}>
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Instruktøren har begrænset filadgang for dette fag på Canvas.</span>
          </div>
        )}

        {/* Moduler view */}
        {materialsView === 'moduler' && (
          !hasModules ? (
            <div className="bg-white px-5 py-12 text-center" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ingen materialer endnu</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Kør Canvas sync for at hente kursusfiler automatisk.</p>
            </div>
          ) : (
            <div className="bg-white overflow-hidden" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              {/* Search + Filter */}
              <div className="px-4 py-3 space-y-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Søg efter fil…"
                    className="w-full pl-9 pr-8 py-2 text-sm focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid transparent',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  {search && (
                    <button onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {FILTERS.map(f => (
                    <button key={f.key} onClick={() => setTypeFilter(f.key)}
                      className="px-3 py-1 text-xs font-medium transition-colors"
                      style={{
                        borderRadius: '20px',
                        backgroundColor: typeFilter === f.key ? 'var(--accent-primary)' : 'var(--bg-primary)',
                        color: typeFilter === f.key ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seneste */}
              {!isFiltering && recentItems.length > 0 && (
                <div style={{ borderBottom: '1px solid var(--border)' }}>
                  <p className="section-label px-4 pt-3 pb-1">Seneste</p>
                  {recentItems.map(({ item, moduleName }) => (
                    <FileRow key={`recent-${item.id}`} item={item} meta={moduleName} />
                  ))}
                </div>
              )}

              {/* Module groups */}
              {filteredGroups.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ingen filer matcher din søgning.</p>
                  <button onClick={() => { setSearch(''); setTypeFilter('alle'); }}
                    className="text-xs mt-1 transition-colors hover:underline"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    Nulstil filter
                  </button>
                </div>
              ) : (
                <div>
                  {filteredGroups.map(({ module, date, lessonNumber, items }, i) => (
                    <ModuleGroup
                      key={module.id}
                      module={module}
                      lessonDate={date}
                      lessonNumber={lessonNumber}
                      items={items}
                      defaultOpen={i < 2}
                      courseId={id}
                      studyPage={studyPageByModule.get(module.id)}
                      onAddStudyPage={() => setStudyPageModal({
                        moduleId: module.id,
                        moduleName: module.name,
                        weekNumber: moduleGroups.find(mg => mg.module.id === module.id)?.module.week ?? undefined,
                      })}
                      onViewStudyPage={(page) => setViewingStudyPage(page)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {/* Studiesider view */}
        {materialsView === 'studiesider' && (
          <div className="bg-white overflow-hidden" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            {courseStudyPages.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <BookMarked className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--border)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ingen studiesider endnu.</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Åbn et modul og tilføj en studieside for at komme i gang.
                </p>
              </div>
            ) : (
              <div>
                {courseStudyPages
                  .sort((a, b) => (a.weekNumber ?? 999) - (b.weekNumber ?? 999))
                  .map(sp => (
                    <button
                      key={sp.id}
                      onClick={() => setViewingStudyPage(sp)}
                      className="w-full flex items-center gap-3 px-5 py-4 transition-colors text-left hover:opacity-80"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <BookMarked className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{sp.title}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                          {sp.moduleName}
                          {sp.createdByName && <> · {sp.createdByName}</>}
                        </p>
                      </div>
                      {sp.weekNumber != null && (
                        <span className="font-mono text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>Uge {sp.weekNumber}</span>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Alle noter view */}
        {materialsView === 'noter' && (() => {
          const courseNotesList = lessonNotes
            .filter(n => n.courseId === id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          const filteredNotes = noteSearch.trim()
            ? courseNotesList.filter(n => n.content.toLowerCase().includes(noteSearch.toLowerCase()))
            : courseNotesList;
          return (
            <div className="bg-white overflow-hidden" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={noteSearch}
                    onChange={e => setNoteSearch(e.target.value)}
                    placeholder="Søg i noter…"
                    className="w-full pl-9 pr-8 py-2 text-sm focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid transparent',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  {noteSearch && (
                    <button onClick={() => setNoteSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {filteredNotes.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <StickyNote className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--border)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {noteSearch ? 'Ingen noter matcher søgningen.' : 'Ingen noter endnu.'}
                  </p>
                  {!noteSearch && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Åbn et modul og tilføj en note for at komme i gang.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  {filteredNotes.map(note => {
                    const initials = note.authorName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                    const updAt = new Date(note.updatedAt);
                    const dateStr = updAt.toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric', month: 'short' });
                    return (
                      <div key={note.id} className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                        <p className="section-label mb-2 truncate">{note.lessonTitle}</p>
                        <MarkdownContent content={note.content} />
                        <div className="flex items-center gap-2 mt-2">
                          <div
                            className="w-5 h-5 flex items-center justify-center shrink-0"
                            style={{ borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)' }}
                          >
                            <span className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>{initials}</span>
                          </div>
                          <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{note.authorName} · {dateStr}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </section>

      {studyPageModal && (
        <StudyPageModal
          courseId={id}
          moduleId={studyPageModal.moduleId}
          moduleName={studyPageModal.moduleName}
          weekNumber={studyPageModal.weekNumber}
          onClose={() => setStudyPageModal(null)}
          onSaved={() => setStudyPageModal(null)}
        />
      )}

      {editingStudyPage && (
        <StudyPageModal
          courseId={id}
          moduleId={editingStudyPage.moduleId}
          moduleName={editingStudyPage.moduleName}
          weekNumber={editingStudyPage.weekNumber}
          existingPageId={editingStudyPage.id}
          existingTitle={editingStudyPage.title}
          existingHtml={editingStudyPage.htmlContent}
          onClose={() => setEditingStudyPage(null)}
          onSaved={() => setEditingStudyPage(null)}
        />
      )}

      {viewingStudyPage && (
        <StudyPageViewer
          page={viewingStudyPage}
          courseName={course.name}
          onClose={() => setViewingStudyPage(null)}
        />
      )}

      {/* Notes */}
      {courseNotes.length > 0 && (
        <section className="space-y-4">
          <p className="section-label px-1">Noter</p>
          {sortedWeeks.map(week => (
            <div key={week} className="space-y-3">
              <p className="section-label">
                {/^uge\s+\d+$/i.test(week.trim()) ? `Uge ${week.match(/\d+/)?.[0]}` : /^\d+$/.test(week.trim()) ? `Uge ${week}` : week}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {notesByWeek[week].map(note => <NoteCard key={note.id} note={note} />)}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
