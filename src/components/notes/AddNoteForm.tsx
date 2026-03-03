'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Upload } from 'lucide-react';
import type { NoteFormat } from '@/types';

interface AddNoteFormProps {
  onClose: () => void;
}

const NOTE_FORMATS: { value: NoteFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word (DOCX)' },
  { value: 'pptx', label: 'PowerPoint (PPTX)' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
  { value: 'txt', label: 'Tekst (TXT)' },
  { value: 'link', label: 'Link' },
  { value: 'andet', label: 'Andet' },
];

const MAX_UPLOAD_BYTES = 1_500_000; // ca. 1.5 MB

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Kunne ikke læse filen.'));
    reader.readAsDataURL(file);
  });
}

function inferFormat(fileName: string): NoteFormat {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (ext === 'pptx' || ext === 'ppt') return 'pptx';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (ext === 'txt' || ext === 'md') return 'txt';
  return 'andet';
}

function normalizeWeekLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const withoutPrefix = trimmed.replace(/^uge\s*/i, '').trim();
  if (!withoutPrefix) return '';

  if (/^\d+$/.test(withoutPrefix)) return `Uge ${withoutPrefix}`;
  if (/^week\s*\d+$/i.test(trimmed)) return `Uge ${withoutPrefix.replace(/^week\s*/i, '')}`;
  if (/^uge\s+/i.test(trimmed)) return `Uge ${withoutPrefix}`;
  return trimmed;
}

export function AddNoteForm({ onClose }: AddNoteFormProps) {
  const { courses, addNote } = useApp();

  const [inputMode, setInputMode] = useState<'link' | 'upload'>('link');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    courseId: courses[0]?.id ?? '',
    week: '',
    format: 'pdf' as NoteFormat,
    url: '',
    tags: '',
    examRelevant: false,
  });

  const isValid = useMemo(() => {
    const base = Boolean(form.title.trim() && form.courseId && form.week.trim());
    if (!base) return false;
    if (inputMode === 'link') return Boolean(form.url.trim());
    return Boolean(file);
  }, [file, form.courseId, form.title, form.url, form.week, inputMode]);

  if (courses.length === 0) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-sm text-gray-500">Du skal oprette et fag, før du kan tilføje noter.</p>
        <Link
          href="/fag"
          onClick={onClose}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Gå til Fag <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const commonPayload = {
        title: form.title.trim(),
        courseId: form.courseId,
        week: normalizeWeekLabel(form.week),
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        examRelevant: form.examRelevant,
      };

      if (inputMode === 'link') {
        addNote({
          ...commonPayload,
          format: form.format,
          url: form.url.trim(),
          sourceType: 'link',
        });
      } else {
        if (!file) return;
        if (file.size > MAX_UPLOAD_BYTES) {
          setError('Filen er for stor til lokal lagring. Brug max ca. 1.5 MB eller indsæt et link.');
          return;
        }

        const dataUrl = await readFileAsDataUrl(file);
        addNote({
          ...commonPayload,
          format: inferFormat(file.name),
          url: dataUrl,
          sourceType: 'upload',
          fileName: file.name,
          mimeType: file.type,
        });
      }

      onClose();
    } catch {
      setError('Der opstod en fejl ved gemning af noten. Prøv igen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => {
            setInputMode('link');
            setError('');
          }}
          className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
            inputMode === 'link' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          Link/reference
        </button>
        <button
          type="button"
          onClick={() => {
            setInputMode('upload');
            setError('');
          }}
          className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
            inputMode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          Upload fil
        </button>
      </div>

      <Field label="Titel *">
        <input
          className={inputClass}
          placeholder="f.eks. Noter til forelæsning 5"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          required
          autoFocus
        />
      </Field>

      <Field label="Fag *">
        <select
          className={inputClass}
          value={form.courseId}
          onChange={(e) => setForm((prev) => ({ ...prev, courseId: e.target.value }))}
          required
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Uge *">
          <input
            className={inputClass}
            placeholder="f.eks. Uge 10"
            value={form.week}
            onChange={(e) => setForm((prev) => ({ ...prev, week: e.target.value }))}
            required
          />
        </Field>

        {inputMode === 'link' ? (
          <Field label="Format *">
            <select
              className={inputClass}
              value={form.format}
              onChange={(e) => setForm((prev) => ({ ...prev, format: e.target.value as NoteFormat }))}
              required
            >
              {NOTE_FORMATS.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Fil">
            <label className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <Upload className="w-4 h-4" />
              Vælg fil
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const nextFile = e.target.files?.[0] ?? null;
                  setFile(nextFile);
                  setError('');
                }}
              />
            </label>
            <p className="text-xs text-gray-500 mt-1.5">
              {file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : 'Ingen fil valgt'}
            </p>
          </Field>
        )}
      </div>

      {inputMode === 'link' ? (
        <Field label="Link / filreference *">
          <input
            className={inputClass}
            placeholder="https://... eller sti/reference"
            value={form.url}
            onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
            required
          />
        </Field>
      ) : (
        <p className="text-xs text-gray-500">Upload gemmes lokalt i browseren. Store filer bør lægges som link.</p>
      )}

      <Field label="Tags (kommasepareret)">
        <input
          className={inputClass}
          placeholder="f.eks. teori, øvelse, recap"
          value={form.tags}
          onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={form.examRelevant}
          onChange={(e) => setForm((prev) => ({ ...prev, examRelevant: e.target.checked }))}
        />
        Eksamensrelevant
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" disabled={!isValid || isSubmitting}>
          {isSubmitting ? 'Gemmer...' : 'Tilføj note'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={isSubmitting}>
          Annuller
        </Button>
      </div>
    </form>
  );
}
