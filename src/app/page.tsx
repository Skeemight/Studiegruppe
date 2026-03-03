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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Oversigt</h1>
        <p className="text-sm text-gray-500 mt-1">Her er et overblik over din studiegruppe.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Opgaver færdige"
          value={`${doneTasks} / ${totalTasks}`}
          icon={<CheckSquare className="w-5 h-5" />}
          color="green"
        />
        <StatsCard
          label="I gang"
          value={inProgressTasks}
          icon={<Clock className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          label="Kommende eksamener"
          value={upcomingExams}
          icon={<BookOpen className="w-5 h-5" />}
          color="purple"
        />
        <StatsCard
          label="Dokumenter"
          value={documents.length}
          icon={<FileText className="w-5 h-5" />}
          color="orange"
        />
      </div>

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
