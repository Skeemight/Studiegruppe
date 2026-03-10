'use client';

import Link from 'next/link';
import { useApp } from '@/store/AppContext';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight } from 'lucide-react';

export function UpcomingTasks() {
  const { tasks, getCourseById } = useApp();

  const upcoming = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5);

  return (
    <div className="bg-white" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="section-label">Kommende opgaver</p>
        <Link
          href="/tasks"
          className="text-xs flex items-center gap-1 font-medium hover:underline"
          style={{ color: 'var(--accent-primary)' }}
        >
          Se alle <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Ingen afventende opgaver — godt gået!
        </div>
      ) : (
        <ul>
          {upcoming.map((task) => {
            const course = getCourseById(task.courseId);
            const deadline = new Date(task.deadline);
            const isOverdue = deadline < new Date();

            return (
              <li
                key={task.id}
                className="flex items-center gap-3 px-5 py-2.5 transition-colors"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex-1 min-w-0">
                  {task.url ? (
                    <a href={task.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium truncate hover:underline block"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {task.title}
                    </a>
                  ) : (
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                  )}
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{course?.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={task.status} />
                  <span
                    className="font-mono text-xs font-medium"
                    style={{ color: isOverdue ? 'var(--accent-error)' : 'var(--text-muted)' }}
                  >
                    {deadline.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
