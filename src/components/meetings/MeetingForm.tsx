'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Meeting } from '@/types';

interface MeetingFormProps {
  initialMeeting?: Meeting;
  submitLabel: string;
  onSubmit: (meeting: Omit<Meeting, 'id'>) => void;
  onCancel: () => void;
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

function toInputDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIso(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function MeetingForm({ initialMeeting, submitLabel, onSubmit, onCancel }: MeetingFormProps) {
  const [form, setForm] = useState({
    title: initialMeeting?.title ?? 'Ugentligt gruppemøde',
    date: initialMeeting ? toInputDateTime(initialMeeting.date) : '',
    location: initialMeeting?.location ?? '',
    agenda: initialMeeting?.agenda.join('\n') ?? '',
    decisions: initialMeeting?.decisions.join('\n') ?? '',
  });

  const isValid = useMemo(
    () => form.title.trim() && form.location.trim() && form.date,
    [form.date, form.location, form.title]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const agenda = form.agenda
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const decisions = form.decisions
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    onSubmit({
      title: form.title.trim(),
      date: toIso(form.date),
      location: form.location.trim(),
      agenda,
      decisions,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Titel *">
        <input
          className={inputClass}
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          required
          autoFocus
        />
      </Field>

      <Field label="Dato og tid *">
        <input
          type="datetime-local"
          className={inputClass}
          value={form.date}
          onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
          required
        />
      </Field>

      <Field label="Sted *">
        <input
          className={inputClass}
          placeholder="f.eks. CBS Library"
          value={form.location}
          onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
          required
        />
      </Field>

      <Field label="Agenda (ét punkt pr. linje)">
        <textarea
          className={`${inputClass} resize-none`}
          rows={4}
          value={form.agenda}
          onChange={(e) => setForm((prev) => ({ ...prev, agenda: e.target.value }))}
        />
      </Field>

      <Field label="Beslutninger (ét punkt pr. linje)">
        <textarea
          className={`${inputClass} resize-none`}
          rows={3}
          value={form.decisions}
          onChange={(e) => setForm((prev) => ({ ...prev, decisions: e.target.value }))}
        />
      </Field>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" disabled={!isValid}>
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Annuller
        </Button>
      </div>
    </form>
  );
}
