'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';
import { COURSE_COLORS, DOT_COLORS, type CourseColor } from '@/lib/courseColors';

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
  const { addCourse, courses } = useApp();
  const usedColors = new Set(courses.map((c) => c.color));
  const defaultColor = (COURSE_COLORS.find((c) => !usedColors.has(c)) ?? 'blue') as CourseColor;
  const [form, setForm] = useState({ name: '', code: '', semester: '', color: defaultColor });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addCourse({ name: form.name.trim(), code: form.code.trim() || undefined, semester: form.semester.trim(), color: form.color });
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

      <Field label="Kurskode">
        <input
          className={inputClass}
          placeholder="f.eks. BINT01642D"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
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

      <Field label="Farve">
        <div className="flex items-center gap-2 flex-wrap">
          {COURSE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setForm({ ...form, color })}
              className={`w-7 h-7 rounded-full transition-all ${form.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: DOT_COLORS[color] }}
              title={color}
            />
          ))}
        </div>
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
