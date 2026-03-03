'use client';

import { useApp } from '@/store/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ExternalLink, Trash2 } from 'lucide-react';
import type { Document } from '@/types';

interface DocumentCardProps {
  document: Document;
}

export function DocumentCard({ document: doc }: DocumentCardProps) {
  const { deleteDocument, getCourseById } = useApp();
  const course = getCourseById(doc.courseId);

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{doc.title}</p>
          {course && (
            <p className="text-xs text-gray-400 mt-0.5">{course.name}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Åbn link"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteDocument(doc.id)}
            className="text-red-400 hover:bg-red-50 p-1.5"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {doc.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {doc.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
