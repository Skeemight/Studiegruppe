'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';
import { MEMBER_OPTIONS } from '@/config/group';
import { ArrowRight } from 'lucide-react';
import type { TaskStatus } from '@/types';

interface AddTaskFormProps {
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

export function AddTaskForm({ onClose }: AddTaskFormProps) {
  const { courses, addTask } = useApp();
  const [form, setForm] = useState({
    title: '',
    courseId: courses[0]?.id ?? '',
    deadline: '',
    status: 'todo' as TaskStatus,
    assignedTo: '',
  });

  if (courses.length === 0) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-sm text-gray-500">Du skal oprette et fag, før du kan tilføje opgaver.</p>
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
    if (!form.title.trim() || !form.deadline || !form.courseId) return;
    addTask({ ...form, title: form.title.trim(), assignedTo: form.assignedTo.trim() });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Titel *">
        <input
          className={inputClass}
          placeholder="f.eks. Aflevering 4: Grafalgoritmer"
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

      <Field label="Frist *">
        <input
          type="date"
          className={inputClass}
          value={form.deadline}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          required
        />
      </Field>

      <Field label="Status">
        <select
          className={inputClass}
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
        >
          <option value="todo">At gøre</option>
          <option value="in_progress">I gang</option>
          <option value="done">Færdig</option>
        </select>
      </Field>

      <Field label="Tildelt til">
        <select
          className={inputClass}
          value={form.assignedTo}
          onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
        >
          <option value="">Ikke tildelt</option>
          {MEMBER_OPTIONS.map((member) => (
            <option key={member} value={member}>
              {member}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">
          Tilføj opgave
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Annuller
        </Button>
      </div>
    </form>
  );
}
