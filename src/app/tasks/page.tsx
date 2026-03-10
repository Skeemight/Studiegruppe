'use client';

import { useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { MemberColumn } from '@/components/tasks/MemberColumn';
import { AddTaskForm } from '@/components/tasks/AddTaskForm';
import { Modal } from '@/components/ui/Modal';
import { Plus, List, Users, Circle, CheckCircle2, Clock, ExternalLink, Trash2 } from 'lucide-react';
import { getCourseColor } from '@/lib/courseColors';
import type { Task, TaskStatus } from '@/types';

// ── Week grouping helpers ──────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekGroup(deadline: string, todayStr: string): 'overdue' | 'this_week' | 'next_week' | 'later' {
  const d = daysFromNow(deadline);
  if (deadline < todayStr) return 'overdue';
  if (d <= 7) return 'this_week';
  if (d <= 14) return 'next_week';
  return 'later';
}

function daysFromNow(isoDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate + 'T12:00:00'); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const GROUP_LABELS: Record<string, { label: string; color: string }> = {
  overdue:   { label: 'Overskredet',  color: 'text-red-500' },
  this_week: { label: 'Denne uge',    color: 'text-gray-700' },
  next_week: { label: 'Næste uge',    color: 'text-gray-600' },
  later:     { label: 'Senere',       color: 'text-gray-400' },
  done:      { label: 'Færdige',      color: 'text-gray-400' },
};

const GROUP_ORDER = ['overdue', 'this_week', 'next_week', 'later', 'done'];

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Aktiv',
  in_progress: 'I gang',
  done: 'Færdig',
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
};

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: Task }) {
  const { updateTask, deleteTask, getCourseById } = useApp();
  const course = getCourseById(task.courseId);
  const colors = getCourseColor(course?.color, task.courseId);
  const deadline = task.deadline ? new Date(task.deadline + (task.deadline.length === 10 ? 'T12:00:00' : '')) : null;
  const isOverdue = deadline && deadline < new Date() && task.status !== 'done';
  const isDone = task.status === 'done';

  return (
    <div className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors ${isDone ? 'opacity-50' : ''}`}>
      {/* Status toggle */}
      <button
        onClick={() => updateTask(task.id, { status: NEXT_STATUS[task.status] })}
        title={STATUS_LABEL[task.status]}
        className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors"
      >
        {isDone
          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          : task.status === 'in_progress'
          ? <Clock className="w-4 h-4 text-blue-400" />
          : <Circle className="w-4 h-4" />
        }
      </button>

      {/* Course dot */}
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />

      {/* Title */}
      <div className="flex-1 min-w-0">
        {task.url ? (
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-sm font-medium hover:text-blue-600 flex items-center gap-1 ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}
          >
            {task.title}
            <ExternalLink className="w-3 h-3 shrink-0 text-gray-300" />
          </a>
        ) : (
          <p className={`text-sm font-medium truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.title}
          </p>
        )}
        {(course || task.assignedTo) && (
          <p className="text-xs text-gray-400 truncate">
            {[course?.name, task.assignedTo].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Deadline */}
      {deadline && (
        <span className={`text-xs tabular-nums shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          {deadline.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
        </span>
      )}

      {/* Delete (on hover) */}
      <button
        onClick={() => deleteTask(task.id)}
        className="shrink-0 p-1 rounded-lg text-gray-200 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { tasks, addTask, groupConfig, courses, currentUser } = useApp();
  const [view, setView] = useState<'list' | 'person'>('list');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [hideDone, setHideDone] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Quick-add state
  const [quickTitle, setQuickTitle] = useState('');
  const quickRef = useRef<HTMLInputElement>(null);

  const members = groupConfig?.members ?? [];

  const tasksByMember = Object.fromEntries(
    members.map((member) => [
      member,
      tasks.filter((t) => t.assignedTo === member),
    ])
  );
  const unassigned = tasks.filter((t) => !t.assignedTo || t.assignedTo === '');

  const todayStr = localDateStr(new Date());

  // Filter for list view
  const filtered = tasks.filter((t) => courseFilter === 'all' || t.courseId === courseFilter);

  // Group tasks
  const groups: Record<string, Task[]> = { overdue: [], this_week: [], next_week: [], later: [], done: [] };
  for (const task of filtered) {
    if (task.status === 'done') {
      groups.done.push(task);
    } else {
      const g = task.deadline ? getWeekGroup(task.deadline.slice(0, 10), todayStr) : 'later';
      groups[g].push(task);
    }
  }

  // Sort each group by deadline
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  }

  const openCount = tasks.filter((t) => t.status !== 'done').length;

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    const courseId = courseFilter !== 'all' ? courseFilter : (courses[0]?.id ?? '');
    addTask({
      title,
      courseId,
      deadline: deadline.toISOString().slice(0, 10),
      status: 'todo',
      assignedTo: currentUser?.name ?? '',
    });
    setQuickTitle('');
    quickRef.current?.focus();
  }

  return (
    <div className="space-y-5 max-w-[780px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[32px] leading-tight" style={{ color: 'var(--text-primary)' }}>Opgaver</h1>
          <p className="font-mono text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{openCount} åbne</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: 'var(--accent-primary)', borderRadius: 'var(--radius-sm)' }}
        >
          <Plus className="w-4 h-4" />
          Ny opgave
        </button>
      </div>

      {/* View + filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Liste
          </button>
          <button
            onClick={() => setView('person')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              view === 'person' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Per person
          </button>
        </div>

        {view === 'list' && courses.length > 0 && (
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Alle fag</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {view === 'person' && (
          <button
            onClick={() => setHideDone(!hideDone)}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors ml-auto"
          >
            {hideDone ? 'Vis færdige' : 'Skjul færdige'}
          </button>
        )}
      </div>

      {view === 'person' ? (
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
            {members.map((member) => (
              <MemberColumn
                key={member}
                member={member}
                tasks={tasksByMember[member] ?? []}
                hideDone={hideDone}
              />
            ))}
            <MemberColumn
              member="Ikke tildelt"
              tasks={unassigned}
              hideDone={hideDone}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Quick-add row */}
          <form onSubmit={handleQuickAdd} className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Plus className="w-4 h-4 text-gray-300 shrink-0" />
            <input
              ref={quickRef}
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Ny opgave… (tryk Enter for at tilføje)"
              className="flex-1 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none bg-transparent"
            />
            {quickTitle && (
              <button
                type="submit"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 shrink-0"
              >
                Tilføj
              </button>
            )}
          </form>

          {/* Grouped tasks */}
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-gray-400">Ingen opgaver endnu</p>
              <p className="text-xs text-gray-300 mt-1">Skriv en titel ovenfor og tryk Enter</p>
            </div>
          ) : (
            <div>
              {GROUP_ORDER.map((groupKey) => {
                const groupTasks = groups[groupKey] ?? [];
                if (groupTasks.length === 0) return null;
                if (groupKey === 'done' && hideDone) return (
                  <div key="done-hidden" className="px-4 py-2 border-t border-gray-50">
                    <button
                      onClick={() => setHideDone(false)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {groupTasks.length} færdige — vis
                    </button>
                  </div>
                );

                const { label, color } = GROUP_LABELS[groupKey];
                return (
                  <div key={groupKey} className="border-t border-gray-50 first:border-t-0">
                    <div className="px-4 pt-3 pb-1">
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${color}`}>
                        {label}
                      </span>
                    </div>
                    {groupTasks.map((task) => (
                      <TaskRow key={task.id} task={task} />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Tilføj ny opgave">
        <AddTaskForm onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
