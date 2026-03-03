'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { ExamCard } from '@/components/exams/ExamCard';
import { AddExamForm } from '@/components/exams/AddExamForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

export default function ExamsPage() {
  const { exams } = useApp();
  const [showForm, setShowForm] = useState(false);

  const sorted = [...exams].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eksamener</h1>
          <p className="text-sm text-gray-500 mt-1">{exams.length} planlagt</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Tilføj eksamen
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">Ingen eksamener planlagt</p>
          <p className="text-sm mt-1">Tilføj en eksamen for at begynde at holde styr på din forberedelse.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Planlæg eksamen">
        <AddExamForm onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
