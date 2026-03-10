'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { FagCard } from '@/components/fag/FagCard';
import { AddFagForm } from '@/components/fag/AddFagForm';
import { MergeCoursesModal } from '@/components/fag/MergeCoursesModal';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Plus, Merge } from 'lucide-react';

export default function FagPage() {
  const { courses } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showMerge, setShowMerge] = useState(false);

  return (
    <div className="space-y-6 max-w-[780px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[32px] leading-tight" style={{ color: 'var(--text-primary)' }}>Fag</h1>
          <p className="font-mono text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {courses.length} {courses.length === 1 ? 'fag oprettet' : 'fag oprettet'}
          </p>
        </div>
        <div className="flex gap-2">
          {courses.length >= 2 && (
            <Button variant="secondary" onClick={() => setShowMerge(true)}>
              <Merge className="w-4 h-4 mr-1" />
              Sammenflet
            </Button>
          )}
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Tilføj fag
          </Button>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
          <p className="text-lg font-medium">Ingen fag oprettet endnu</p>
          <p className="text-sm mt-1">
            Opret dine fag her — de bruges til at organisere opgaver, dokumenter og eksamener.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {courses.map((course) => (
            <FagCard key={course.id} course={course} />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Tilføj fag">
        <AddFagForm onClose={() => setShowForm(false)} />
      </Modal>

      <Modal open={showMerge} onClose={() => setShowMerge(false)} title="Sammenflet fag">
        <MergeCoursesModal onClose={() => setShowMerge(false)} />
      </Modal>
    </div>
  );
}
