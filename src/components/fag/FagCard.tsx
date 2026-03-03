'use client';

import { useApp } from '@/store/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Trash2, CheckSquare, FileText, BookOpen } from 'lucide-react';
import type { Course } from '@/types';

interface FagCardProps {
  course: Course;
}

export function FagCard({ course }: FagCardProps) {
  const { deleteCourse, tasks, documents, exams } = useApp();

  const taskCount = tasks.filter((t) => t.courseId === course.id).length;
  const docCount = documents.filter((d) => d.courseId === course.id).length;
  const examCount = exams.filter((e) => e.courseId === course.id).length;

  return (
    <Card className="p-5 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">{course.name}</p>
        {course.semester && (
          <p className="text-sm text-gray-400 mt-0.5">{course.semester}</p>
        )}
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
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => deleteCourse(course.id)}
        className="text-red-400 hover:bg-red-50 p-1.5 shrink-0"
        title="Slet fag"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </Card>
  );
}
