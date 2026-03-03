'use client';

import { useApp } from '@/store/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CalendarDays, Trash2 } from 'lucide-react';
import type { Exam } from '@/types';

interface ExamCardProps {
  exam: Exam;
}

export function ExamCard({ exam }: ExamCardProps) {
  const { deleteExam, getCourseById } = useApp();
  const course = getCourseById(exam.courseId);
  const examDate = new Date(exam.date);
  const isPast = examDate < new Date();
  const daysUntil = Math.ceil(
    (examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="p-5 flex items-start gap-4">
      <div
        className={`p-2.5 rounded-xl shrink-0 ${
          isPast ? 'bg-gray-100' : 'bg-purple-50'
        }`}
      >
        <CalendarDays
          className={`w-5 h-5 ${isPast ? 'text-gray-400' : 'text-purple-600'}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900">{course?.name ?? 'Ukendt fag'}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {examDate.toLocaleDateString('da-DK', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isPast ? (
              <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                Forbi
              </span>
            ) : (
              <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-semibold">
                {daysUntil}d
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteExam(exam.id)}
              className="text-red-400 hover:bg-red-50 p-1.5"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {exam.notes && (
          <p className="text-sm text-gray-500 mt-3 bg-gray-50 rounded-lg px-3 py-2.5 leading-relaxed">
            {exam.notes}
          </p>
        )}
      </div>
    </Card>
  );
}
