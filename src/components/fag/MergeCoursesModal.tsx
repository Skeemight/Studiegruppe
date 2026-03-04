'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from 'lucide-react';
import { saveMergeRule } from '@/lib/canvasApi';

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';

interface Props {
  onClose: () => void;
}

export function MergeCoursesModal({ onClose }: Props) {
  const { courses, tasks, documents, exams, mergeCourses } = useApp();

  const [keepId, setKeepId] = useState('');
  const [removeId, setRemoveId] = useState('');
  const [newName, setNewName] = useState('');

  const keepCourse = courses.find((c) => c.id === keepId);
  const removeCourse = courses.find((c) => c.id === removeId);

  const countFor = (id: string) => ({
    tasks: tasks.filter((t) => t.courseId === id).length,
    docs: documents.filter((d) => d.courseId === id).length,
    exams: exams.filter((e) => e.courseId === id).length,
  });

  const canSubmit = keepId && removeId && keepId !== removeId && newName.trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const trimmedName = newName.trim();
    mergeCourses(keepId, removeId, trimmedName);

    // If both are Canvas courses, remember the rule for future syncs
    if (keepId.startsWith('canvas-') && removeId.startsWith('canvas-')) {
      saveMergeRule({
        keepId,
        keepName: keepCourse!.name,
        removeId,
        removeName: removeCourse!.name,
        name: trimmedName,
      });
    }

    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-gray-500">
        Flyt alle opgaver, dokumenter og eksamener fra ét fag til et andet og slet det tomme.
      </p>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Slet dette fag</label>
          <select
            className={inputClass}
            value={removeId}
            onChange={(e) => {
              setRemoveId(e.target.value);
              if (!newName && keepCourse) setNewName(keepCourse.name);
            }}
            required
          >
            <option value="">Vælg fag…</option>
            {courses
              .filter((c) => c.id !== keepId)
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
          {removeCourse && (
            <p className="text-xs text-gray-400 mt-1">
              {countFor(removeCourse.id).tasks} opgaver · {countFor(removeCourse.id).docs} dokumenter · {countFor(removeCourse.id).exams} eksamener
            </p>
          )}
        </div>

        <ArrowRight className="w-4 h-4 text-gray-400 mt-5 shrink-0" />

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Behold dette fag</label>
          <select
            className={inputClass}
            value={keepId}
            onChange={(e) => {
              setKeepId(e.target.value);
              const chosen = courses.find((c) => c.id === e.target.value);
              if (chosen) setNewName(chosen.name);
            }}
            required
          >
            <option value="">Vælg fag…</option>
            {courses
              .filter((c) => c.id !== removeId)
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
          {keepCourse && (
            <p className="text-xs text-gray-400 mt-1">
              {countFor(keepCourse.id).tasks} opgaver · {countFor(keepCourse.id).docs} dokumenter · {countFor(keepCourse.id).exams} eksamener
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nyt navn på det samlede fag</label>
        <input
          className={inputClass}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="f.eks. Organisationsteori"
          required
        />
      </div>

      {canSubmit && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
          <strong>&quot;{removeCourse?.name}&quot;</strong> slettes. Alt indhold flyttes til <strong>&quot;{newName}&quot;</strong>.
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={!canSubmit} className="flex-1">
          Sammenflet fag
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Annuller
        </Button>
      </div>
    </form>
  );
}
