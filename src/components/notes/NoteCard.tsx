'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ExternalLink, Trash2, Download, Eye } from 'lucide-react';
import type { StudyNote } from '@/types';

interface NoteCardProps {
  note: StudyNote;
}

function formatWeekLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^uge\s+\d+$/i.test(trimmed)) return `Uge ${trimmed.match(/\d+/)?.[0] ?? trimmed}`;
  if (/^\d+$/.test(trimmed)) return `Uge ${trimmed}`;
  return trimmed;
}

function canPreview(note: StudyNote): boolean {
  if (note.sourceType !== 'upload') return false;
  const mime = note.mimeType?.toLowerCase() ?? '';
  return mime.startsWith('image/') || mime.includes('pdf') || mime.startsWith('text/');
}

function decodeTextFromDataUrl(dataUrl: string): string {
  try {
    const separator = dataUrl.indexOf(',');
    if (separator < 0) return '';
    const meta = dataUrl.slice(0, separator);
    const payload = dataUrl.slice(separator + 1);

    if (meta.includes(';base64')) {
      const binary = window.atob(payload);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    }

    return decodeURIComponent(payload);
  } catch {
    return '';
  }
}

export function NoteCard({ note }: NoteCardProps) {
  const { getCourseById, deleteNote } = useApp();
  const course = getCourseById(note.courseId);
  const isUploaded = note.sourceType === 'upload';
  const previewEnabled = canPreview(note);
  const [showPreview, setShowPreview] = useState(false);

  const previewType = useMemo(() => {
    const mime = note.mimeType?.toLowerCase() ?? '';
    if (mime.startsWith('image/')) return 'image';
    if (mime.includes('pdf')) return 'pdf';
    if (mime.startsWith('text/')) return 'text';
    return 'unsupported';
  }, [note.mimeType]);

  const textPreview = useMemo(() => {
    if (!showPreview || previewType !== 'text') return '';
    return decodeTextFromDataUrl(note.url);
  }, [note.url, previewType, showPreview]);

  return (
    <>
      <Card className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{note.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {course?.name ?? 'Ukendt fag'} · {formatWeekLabel(note.week)}
            </p>
            {isUploaded && note.fileName && (
              <p className="text-xs text-gray-400 mt-1 truncate">Fil: {note.fileName}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {previewEnabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(true)}
                className="p-1.5 text-gray-500 hover:bg-gray-100"
                title="Preview"
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}

            <a
              href={note.url}
              target="_blank"
              rel="noopener noreferrer"
              download={isUploaded ? note.fileName || true : undefined}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title={isUploaded ? 'Download fil' : 'Åbn note'}
            >
              {isUploaded ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteNote(note.id)}
              className="text-red-400 hover:bg-red-50 p-1.5"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs rounded-full px-2 py-0.5 bg-gray-100 text-gray-700 font-medium uppercase">
            {note.format}
          </span>
          <span className="text-xs rounded-full px-2 py-0.5 bg-gray-100 text-gray-600 font-medium">
            {isUploaded ? 'Upload' : 'Link'}
          </span>
          {note.examRelevant && <Badge variant="default">Eksamensrelevant</Badge>}
        </div>

        {note.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {note.tags.map((tag) => (
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

      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Preview" size="xl">
        {previewType === 'image' && (
          <img src={note.url} alt={note.title} className="max-h-[70vh] w-auto mx-auto rounded-lg" />
        )}

        {previewType === 'pdf' && (
          <iframe src={note.url} title={note.title} className="w-full h-[70vh] rounded-lg border border-gray-200" />
        )}

        {previewType === 'text' && (
          <pre className="w-full h-[70vh] overflow-auto rounded-lg border border-gray-200 p-3 text-xs text-gray-700 whitespace-pre-wrap">
            {textPreview || 'Kunne ikke vise tekst-preview for denne fil.'}
          </pre>
        )}

        {previewType === 'unsupported' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Preview understøttes ikke for denne filtype endnu.</p>
            <a
              href={note.url}
              download={note.fileName || true}
              className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Download fil
            </a>
          </div>
        )}
      </Modal>
    </>
  );
}
