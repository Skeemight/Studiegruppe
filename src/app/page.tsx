'use client';

import { useApp } from '@/store/AppContext';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { UpcomingTasks } from '@/components/dashboard/UpcomingTasks';
import { NextExam } from '@/components/dashboard/NextExam';
import { CheckSquare, Clock, BookOpen, FileText } from 'lucide-react';

export default function DashboardPage() {
  const { tasks, exams, documents } = useApp();

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const upcomingExams = exams.filter((e) => new Date(e.date) >= new Date()).length;

  return (
    <div className="space-y-8 max-w-[780px] mx-auto">
      <h1 className="font-serif text-[32px] leading-tight" style={{ color: 'var(--text-primary)' }}>
        Oversigt
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          label="Færdige"
          value={`${doneTasks} / ${totalTasks}`}
          icon={<CheckSquare className="w-5 h-5" />}
          color="green"
          href="/tasks"
        />
        <StatsCard
          label="I gang"
          value={inProgressTasks}
          icon={<Clock className="w-5 h-5" />}
          color="blue"
          href="/tasks"
        />
        <StatsCard
          label="Eksamener"
          value={upcomingExams}
          icon={<BookOpen className="w-5 h-5" />}
          color="purple"
          href="/exams"
        />
        <StatsCard
          label="Dokumenter"
          value={documents.length}
          icon={<FileText className="w-5 h-5" />}
          color="orange"
          href="/documents"
        />
      </div>

      <div className="divider" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UpcomingTasks />
        </div>
        <div>
          <NextExam />
        </div>
      </div>
    </div>
  );
}
