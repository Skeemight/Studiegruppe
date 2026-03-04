'use client';

import { useApp } from '@/store/AppContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Trash2, User, ExternalLink } from 'lucide-react';
import type { Task, TaskStatus } from '@/types';
import { getCourseColor } from '@/lib/courseColors';

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
};

const STATUS_ACTION: Record<TaskStatus, string> = {
  todo: 'Start',
  in_progress: 'Fuldfør',
  done: 'Nulstil',
};

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const { updateTask, deleteTask, getCourseById } = useApp();
  const course = getCourseById(task.courseId);
  const colors = getCourseColor(course?.color, task.courseId);
  const deadline = new Date(task.deadline);
  const isOverdue = deadline < new Date() && task.status !== 'done';

  return (
    <Card className="p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {task.url ? (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline"
            >
              {task.title}
            </a>
          ) : (
            <p className="text-sm font-semibold text-gray-900">{task.title}</p>
          )}
          <Badge variant={task.status} />
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {course && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
              {course.name}
            </span>
          )}
          <span
            className={`text-xs font-medium tabular-nums ${
              isOverdue ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            {isOverdue ? 'Overskredet · ' : ''}
            {deadline.toLocaleDateString('da-DK', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          {task.assignedTo && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <User className="w-3 h-3" />
              {task.assignedTo}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.url && (
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Åbn i Canvas"
            className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => updateTask(task.id, { status: NEXT_STATUS[task.status] })}
        >
          {STATUS_ACTION[task.status]}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteTask(task.id)}
          className="text-red-400 hover:bg-red-50 p-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
}
