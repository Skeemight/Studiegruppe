'use client';

import Link from 'next/link';
import { useApp } from '@/store/AppContext';
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
    <div className="bg-white" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="section-label">Næste eksamen</p>
        <Link
          href="/exams"
          className="text-xs flex items-center gap-1 font-medium hover:underline"
          style={{ color: 'var(--accent-primary)' }}
        >
          Se alle <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="p-5">
        {!nextExam ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Ingen kommende eksamener.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
              <div>
                <p className="font-semibold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {getCourseById(nextExam.courseId)?.name ?? 'Ukendt fag'}
                </p>
                <p className="font-mono text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {new Date(nextExam.date).toLocaleDateString('da-DK', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
            </div>

            <div className="px-4 py-3 text-center" style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
              <span className="font-mono text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>{daysUntil}</span>
              <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>dage tilbage</p>
            </div>

            {nextExam.notes && (
              <p className="text-xs leading-relaxed px-3 py-2.5" style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
                {nextExam.notes}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
