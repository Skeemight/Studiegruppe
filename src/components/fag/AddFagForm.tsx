'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';

interface AddFagFormProps {
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

export function AddFagForm({ onClose }: AddFagFormProps) {
  const { addCourse } = useApp();
  const [form, setForm] = useState({ name: '', semester: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addCourse({ name: form.name.trim(), semester: form.semester.trim() });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Fagnavn *">
        <input
          className={inputClass}
          placeholder="f.eks. Algoritmer og Datastrukturer"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          autoFocus
        />
      </Field>

      <Field label="Semester">
        <input
          className={inputClass}
          placeholder="f.eks. Forår 2026"
          value={form.semester}
          onChange={(e) => setForm({ ...form, semester: e.target.value })}
        />
      </Field>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">
          Opret fag
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Annuller
        </Button>
      </div>
    </form>
  );
}
