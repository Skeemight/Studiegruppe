'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { TaskCard } from '@/components/tasks/TaskCard';
import { AddTaskForm } from '@/components/tasks/AddTaskForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import type { TaskStatus } from '@/types';

const STATUS_FILTERS: { label: string; value: TaskStatus | 'all' }[] = [
  { label: 'Alle', value: 'all' },
  { label: 'At gøre', value: 'todo' },
  { label: 'I gang', value: 'in_progress' },
  { label: 'Færdig', value: 'done' },
];

export default function TasksPage() {
  const { tasks } = useApp();
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);
  const sorted = [...filtered].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opgaver</h1>
          <p className="text-sm text-gray-500 mt-1">{tasks.length} i alt</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Tilføj opgave
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">Ingen opgaver fundet</p>
          <p className="text-sm mt-1">Tilføj en ny opgave for at komme i gang.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Tilføj ny opgave">
        <AddTaskForm onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
