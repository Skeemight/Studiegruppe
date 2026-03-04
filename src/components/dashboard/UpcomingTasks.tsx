'use client';

import Link from 'next/link';
import { useApp } from '@/store/AppContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight } from 'lucide-react';

export function UpcomingTasks() {
  const { tasks, getCourseById } = useApp();

  const upcoming = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5);

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h2 className="font-semibold text-gray-900 text-sm">Kommende opgaver</h2>
        <Link
          href="/tasks"
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
        >
          Se alle <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400">
          Ingen afventende opgaver — godt gået!
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {upcoming.map((task) => {
            const course = getCourseById(task.courseId);
            const deadline = new Date(task.deadline);
            const isOverdue = deadline < new Date();

            return (
              <li key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  {task.url ? (
                    <a href={task.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-800 truncate hover:text-blue-600 hover:underline block">
                      {task.title}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{course?.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={task.status} />
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      isOverdue ? 'text-red-500' : 'text-gray-400'
                    }`}
                  >
                    {deadline.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
