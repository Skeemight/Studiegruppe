'use client';

import { useApp } from '@/store/AppContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Trash2, User } from 'lucide-react';
import type { Task, TaskStatus } from '@/types';

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
  const deadline = new Date(task.deadline);
  const isOverdue = deadline < new Date() && task.status !== 'done';

  return (
    <Card className="p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{task.title}</p>
          <Badge variant={task.status} />
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {course && (
            <span className="text-xs text-gray-400 font-medium">{course.name}</span>
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
