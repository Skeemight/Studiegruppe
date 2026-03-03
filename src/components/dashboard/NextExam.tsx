'use client';

import Link from 'next/link';
import { useApp } from '@/store/AppContext';
import { Card } from '@/components/ui/Card';
import { BookOpen, ArrowRight } from 'lucide-react';

export function NextExam() {
  const { exams, getCourseById } = useApp();

  const now = new Date();
  const nextExam = exams
    .filter((e) => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const daysUntil = nextExam
    ? Math.ceil((new Date(nextExam.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h2 className="font-semibold text-gray-900 text-sm">Næste eksamen</h2>
        <Link
          href="/exams"
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
        >
          Se alle <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="p-5">
        {!nextExam ? (
          <p className="text-sm text-gray-400 text-center py-6">Ingen kommende eksamener.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 rounded-lg shrink-0">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm leading-snug">
                  {getCourseById(nextExam.courseId)?.name ?? 'Ukendt fag'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(nextExam.date).toLocaleDateString('da-DK', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl px-4 py-3 text-center">
              <span className="text-3xl font-bold text-purple-700">{daysUntil}</span>
              <p className="text-xs text-purple-500 mt-0.5 font-medium">dage tilbage</p>
            </div>

            {nextExam.notes && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5 leading-relaxed">
                {nextExam.notes}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
