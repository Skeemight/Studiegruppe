'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/store/AppContext';
import { Trash2, Pencil, CheckSquare, CalendarDays, BookOpen } from 'lucide-react';
import type { Course } from '@/types';
import { getCourseColor, getCourseHex } from '@/lib/courseColors';
import { eventMatchesCourse } from '@/lib/courseUtils';
import { EditCourseModal } from '@/components/fag/EditCourseModal';

interface FagCardProps {
  course: Course;
}

export function FagCard({ course }: FagCardProps) {
  const { deleteCourse, tasks, exams, scheduleEvents, courses, courseMapping } = useApp();
  const [showEdit, setShowEdit] = useState(false);
  const hex = getCourseHex(course.color, course.id);

  const pendingTasks = tasks.filter((t) => t.courseId === course.id && t.status !== 'done').length;
  const exam = exams.find((e) => e.courseId === course.id);

  const now = new Date().toISOString();
  const nextLesson = scheduleEvents
    .filter((e) => {
      if (e.start < now) return false;
      return eventMatchesCourse(e.title, course.id, courseMapping, courses);
    })
    .sort((a, b) => a.start.localeCompare(b.start))[0];

  const nextLessonLabel = nextLesson
    ? new Date(nextLesson.start).toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric', month: 'short' })
    : null;

  return (
    <div
      className="group relative bg-white hover-lift"
      style={{
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${hex}`,
        borderRadius: 'var(--radius-md)',
      }}
    >
      <Link href={`/fag/${course.id}`} className="block px-4 py-3">
        <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {course.name}
        </p>
        {course.code && (
          <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{course.code}</p>
        )}

        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
          {nextLessonLabel && (
            <span className="inline-flex items-center gap-1 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              <CalendarDays className="w-3 h-3" />
              {nextLessonLabel}
            </span>
          )}
          {pendingTasks > 0 && (
            <span className="inline-flex items-center gap-1 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              <CheckSquare className="w-3 h-3" />
              {pendingTasks} opgave{pendingTasks !== 1 ? 'r' : ''}
            </span>
          )}
          {exam && (
            <span className="inline-flex items-center gap-1 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              <BookOpen className="w-3 h-3" />
              {new Date(exam.date + 'T12:00:00').toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </Link>

      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.preventDefault(); setShowEdit(true); }}
          className="p-1 rounded transition-colors duration-fast"
          style={{ color: 'var(--text-muted)' }}
          title="Rediger fag"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); deleteCourse(course.id); }}
          className="p-1 rounded transition-colors duration-fast"
          style={{ color: 'var(--text-muted)' }}
          title="Slet fag"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {showEdit && <EditCourseModal course={course} onClose={() => setShowEdit(false)} />}
    </div>
  );
}
