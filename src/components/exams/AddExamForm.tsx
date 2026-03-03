'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from 'lucide-react';

interface AddExamFormProps {
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

export function AddExamForm({ onClose }: AddExamFormProps) {
  const { courses, addExam } = useApp();
  const [form, setForm] = useState({
    courseId: courses[0]?.id ?? '',
    date: '',
    notes: '',
  });

  if (courses.length === 0) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-sm text-gray-500">Du skal oprette et fag, før du kan tilføje eksamener.</p>
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
    if (!form.courseId || !form.date) return;
    addExam({ ...form, notes: form.notes.trim() });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Fag *">
        <select
          className={inputClass}
          value={form.courseId}
          onChange={(e) => setForm({ ...form, courseId: e.target.value })}
          required
          autoFocus
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Dato *">
        <input
          type="date"
          className={inputClass}
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
      </Field>

      <Field label="Noter">
        <textarea
          className={`${inputClass} resize-none`}
          placeholder="Emner at dække, eksamenssted, tidspunkt…"
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </Field>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">
          Planlæg eksamen
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Annuller
        </Button>
      </div>
    </form>
  );
}
