'use client';

import Link from 'next/link';
import { useApp } from '@/store/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Trash2, CheckSquare, FileText, BookOpen, ChevronRight } from 'lucide-react';
import type { Course } from '@/types';
import { getCourseColor } from '@/lib/courseColors';

interface FagCardProps {
  course: Course;
}

export function FagCard({ course }: FagCardProps) {
  const { deleteCourse, tasks, documents, exams } = useApp();
  const colors = getCourseColor(course.color, course.id);

  const taskCount = tasks.filter((t) => t.courseId === course.id).length;
  const docCount = documents.filter((d) => d.courseId === course.id).length;
  const examCount = exams.filter((e) => e.courseId === course.id).length;

  return (
    <Card className={`p-5 flex items-center gap-4 hover:shadow-md transition-all border-l-4 ${colors.border}`}>
      <Link href={`/fag/${course.id}`} className="flex-1 min-w-0 min-h-0">
        <p className="font-semibold text-gray-900 group-hover:text-blue-600">{course.name}</p>
        <p className="text-sm text-gray-400 mt-0.5">
          {[course.code, course.semester].filter(Boolean).join(' · ')}
        </p>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <CheckSquare className="w-3.5 h-3.5" />
            {taskCount} {taskCount === 1 ? 'opgave' : 'opgaver'}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <FileText className="w-3.5 h-3.5" />
            {docCount} {docCount === 1 ? 'dokument' : 'dokumenter'}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <BookOpen className="w-3.5 h-3.5" />
            {examCount} {examCount === 1 ? 'eksamen' : 'eksamener'}
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-1 shrink-0">
        <ChevronRight className="w-4 h-4 text-gray-300" />
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.preventDefault(); deleteCourse(course.id); }}
          className="text-red-400 hover:bg-red-50 p-1.5"
          title="Slet fag"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
