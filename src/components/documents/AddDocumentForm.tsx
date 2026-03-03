'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from 'lucide-react';

interface AddDocumentFormProps {
  onClose: () => void;
}

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

export function AddDocumentForm({ onClose }: AddDocumentFormProps) {
  const { courses, addDocument } = useApp();
  const [form, setForm] = useState({
    title: '',
    courseId: courses[0]?.id ?? '',
    url: '',
    tags: '',
  });

  if (courses.length === 0) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-sm text-gray-500">Du skal oprette et fag, før du kan tilføje dokumenter.</p>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim() || !form.courseId) return;
    addDocument({
      title: form.title.trim(),
      courseId: form.courseId,
      url: form.url.trim(),
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Titel *">
        <input
          className={inputClass}
          placeholder="f.eks. Forelæsningsslides – Uge 8"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          autoFocus
        />
      </Field>

      <Field label="Fag *">
        <select
          className={inputClass}
          value={form.courseId}
          onChange={(e) => setForm({ ...form, courseId: e.target.value })}
          required
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="URL *">
        <input
          type="url"
          className={inputClass}
          placeholder="https://drive.google.com/…"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          required
        />
      </Field>

      <Field label="Tags (kommasepareret)">
        <input
          className={inputClass}
          placeholder="f.eks. slides, noter, projekt"
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
        />
      </Field>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">
          Tilføj dokument
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Annuller
        </Button>
      </div>
    </form>
  );
}
