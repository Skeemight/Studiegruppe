'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Trash2, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import type { Task, TaskStatus } from '@/types';
import { getCourseColor } from '@/lib/courseColors';

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
  todo: 'bg-gray-200 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

const DONE_BORDER = 'border-l-green-400';
const DEFAULT_BORDER = 'border-l-gray-300';

interface MemberColumnProps {
  member: string;
  tasks: Task[];
  hideDone: boolean;
}

function TaskCard({ task }: { task: Task }) {
  const { updateTask, deleteTask, getCourseById } = useApp();
  const now = new Date();
  const deadline = new Date(task.deadline);
  const isOverdue = deadline < now && task.status !== 'done';
  const course = getCourseById(task.courseId);
  const colors = getCourseColor(course?.color, task.courseId);
  const borderClass = task.status === 'done' ? DONE_BORDER : colors.border;

  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${borderClass} p-3 shadow-sm`}>
      {task.url ? (
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-medium text-gray-900 leading-snug mb-2 hover:text-blue-600 hover:underline"
        >
          {task.title}
        </a>
      ) : (
        <p className="text-sm font-medium text-gray-900 leading-snug mb-2">{task.title}</p>
      )}

      {course && (
        <p className="text-xs text-gray-400 mb-2 truncate">{course.name}</p>
      )}

      <div className="flex items-center justify-between gap-1">
        <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
          {isOverdue ? '⚠ ' : ''}
          {deadline.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
        </span>
        <div className="flex items-center gap-1">
          {task.url && (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Åbn i Canvas"
              className="p-1 text-gray-300 hover:text-blue-500 transition-colors rounded"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <button
            onClick={() => updateTask(task.id, { status: NEXT_STATUS[task.status] })}
            className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors hover:opacity-80 ${STATUS_COLORS[task.status]}`}
          >
            {STATUS_LABEL[task.status]}
          </button>
          <button
            onClick={() => deleteTask(task.id)}
            className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function MemberColumn({ member, tasks, hideDone }: MemberColumnProps) {
  const now = new Date();
  const [showPrevious, setShowPrevious] = useState(false);

  const active = tasks.filter(
    (t) => t.status !== 'done' && new Date(t.deadline) >= now
  );
  const previous = tasks.filter(
    (t) => t.status !== 'done' && new Date(t.deadline) < now
  );
  const done = hideDone ? [] : tasks.filter((t) => t.status === 'done');

  const openCount = tasks.filter((t) => t.status !== 'done').length;

  return (
    <div className="flex-shrink-0 w-60 flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 text-sm">{member}</h3>
          {previous.length > 0 && (
            <span className="text-xs font-medium text-red-500">{previous.length} udløbet</span>
          )}
        </div>
        <span className="text-xs text-gray-400 font-medium">{openCount} åbne</span>
      </div>

      <div className="flex flex-col gap-2 min-h-16">
        {active.length === 0 && done.length === 0 && previous.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center">
            <p className="text-xs text-gray-400">Ingen opgaver</p>
          </div>
        ) : (
          <>
            {active.map((task) => <TaskCard key={task.id} task={task} />)}
            {done.map((task) => <TaskCard key={task.id} task={task} />)}

            {previous.length > 0 && (
              <div className="mt-1">
                <button
                  onClick={() => setShowPrevious((v) => !v)}
                  className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors px-1 py-1"
                >
                  {showPrevious ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  Tidligere afleveringer ({previous.length})
                </button>
                {showPrevious && (
                  <div className="flex flex-col gap-2 mt-1 opacity-70">
                    {previous.map((task) => <TaskCard key={task.id} task={task} />)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
