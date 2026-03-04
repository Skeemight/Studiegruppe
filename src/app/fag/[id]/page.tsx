'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/store/AppContext';
import { NoteCard } from '@/components/notes/NoteCard';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, BookOpen, ExternalLink, Trash2 } from 'lucide-react';
import type { Task, TaskStatus } from '@/types';

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Aktiv',
  in_progress: 'I gang',
  done: 'Færdig',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

function formatWeekLabel(value: string) {
  const trimmed = value.trim();
  if (/^uge\s+\d+$/i.test(trimmed)) return `Uge ${trimmed.match(/\d+/)?.[0]}`;
  if (/^\d+$/.test(trimmed)) return `Uge ${trimmed}`;
  return trimmed;
}

function sortByWeekLabel(a: string, b: string) {
  const aMatch = a.match(/\d+/);
  const bMatch = b.match(/\d+/);
  if (aMatch && bMatch) return Number(aMatch[0]) - Number(bMatch[0]);
  return a.localeCompare(b, 'da');
}

function TaskRow({ task }: { task: Task }) {
  const { updateTask, deleteTask } = useApp();
  const deadline = new Date(task.deadline);
  const isOverdue = deadline < new Date() && task.status !== 'done';

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        {task.url ? (
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline flex items-center gap-1"
          >
            {task.title}
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ) : (
          <p className="text-sm font-medium text-gray-900">{task.title}</p>
        )}
        {task.assignedTo && (
          <p className="text-xs text-gray-400 mt-0.5">{task.assignedTo}</p>
        )}
      </div>
      <span className={`text-xs font-medium tabular-nums shrink-0 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
        {isOverdue ? '⚠ ' : ''}
        {deadline.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
      </span>
      <button
        onClick={() => updateTask(task.id, { status: NEXT_STATUS[task.status] })}
        className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 transition-colors hover:opacity-80 ${STATUS_COLORS[task.status]}`}
      >
        {STATUS_LABEL[task.status]}
      </button>
      <button
        onClick={() => deleteTask(task.id)}
        className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const { courses, tasks, documents, notes, exams } = useApp();

  const course = courses.find((c) => c.id === id);
  if (!course) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 text-gray-400">
        <p className="text-lg font-medium">Fag ikke fundet</p>
        <Link href="/fag" className="text-sm text-blue-600 hover:underline mt-2 block">← Tilbage til fag</Link>
      </div>
    );
  }

  const courseTasks = tasks
    .filter((t) => t.courseId === id)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  const courseDocs = documents.filter((d) => d.courseId === id);
  const courseNotes = notes.filter((n) => n.courseId === id);
  const courseExam = exams
    .filter((e) => e.courseId === id && new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  const endOfNextWeek = new Date(endOfWeek);
  endOfNextWeek.setDate(endOfWeek.getDate() + 7);

  const overdue = courseTasks.filter((t) => t.status !== 'done' && new Date(t.deadline) < now);
  const thisWeek = courseTasks.filter((t) => t.status !== 'done' && new Date(t.deadline) >= now && new Date(t.deadline) <= endOfWeek);
  const nextWeek = courseTasks.filter((t) => t.status !== 'done' && new Date(t.deadline) > endOfWeek && new Date(t.deadline) <= endOfNextWeek);
  const later = courseTasks.filter((t) => t.status !== 'done' && new Date(t.deadline) > endOfNextWeek);
  const done = courseTasks.filter((t) => t.status === 'done');

  const taskGroups = [
    { label: 'Overskredet', tasks: overdue, labelColor: 'text-red-600' },
    { label: 'Denne uge', tasks: thisWeek, labelColor: 'text-gray-700' },
    { label: 'Næste uge', tasks: nextWeek, labelColor: 'text-gray-700' },
    { label: 'Senere', tasks: later, labelColor: 'text-gray-500' },
    { label: 'Færdig', tasks: done, labelColor: 'text-green-600' },
  ].filter((g) => g.tasks.length > 0);

  // Group notes by week
  const notesByWeek = courseNotes.reduce<Record<string, typeof courseNotes>>((acc, note) => {
    if (!acc[note.week]) acc[note.week] = [];
    acc[note.week].push(note);
    return acc;
  }, {});
  const sortedWeeks = Object.keys(notesByWeek).sort(sortByWeekLabel);

  const daysUntilExam = courseExam
    ? Math.ceil((new Date(courseExam.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <Link href="/fag" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3">
          <ArrowLeft className="w-3 h-3" /> Alle fag
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
        {course.semester && <p className="text-sm text-gray-400 mt-1">{course.semester}</p>}
      </div>

      {/* Exam banner */}
      {courseExam && (
        <div className="rounded-xl bg-purple-50 border border-purple-100 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-900">
                {new Date(courseExam.date).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {courseExam.notes && <p className="text-xs text-purple-600 mt-0.5">{courseExam.notes}</p>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold text-purple-700">{daysUntilExam}</p>
            <p className="text-xs text-purple-500 font-medium">dage til eksamen</p>
          </div>
        </div>
      )}

      {/* Tasks */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Afleveringer</h2>
          <span className="text-xs text-gray-400">{courseTasks.filter(t => t.status !== 'done').length} åbne</span>
        </div>
        {courseTasks.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">Ingen afleveringer endnu.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {taskGroups.map((group) => (
              <div key={group.label} className="px-5">
                <p className={`text-xs font-semibold uppercase tracking-wide pt-4 pb-1 ${group.labelColor}`}>
                  {group.label}
                </p>
                {group.tasks.map((task) => <TaskRow key={task.id} task={task} />)}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Documents */}
      {courseDocs.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm px-1">Dokumenter</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {courseDocs.map((doc) => <DocumentCard key={doc.id} document={doc} />)}
          </div>
        </div>
      )}

      {/* Notes */}
      {courseNotes.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm px-1">Noter</h2>
          {sortedWeeks.map((week) => (
            <div key={week} className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{formatWeekLabel(week)}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {notesByWeek[week].map((note) => <NoteCard key={note.id} note={note} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {courseDocs.length === 0 && courseNotes.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">Ingen dokumenter eller noter for dette fag endnu.</p>
      )}
    </div>
  );
}
