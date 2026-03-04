'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { TaskCard } from '@/components/tasks/TaskCard';
import { MemberColumn } from '@/components/tasks/MemberColumn';
import { AddTaskForm } from '@/components/tasks/AddTaskForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Plus, List, Users } from 'lucide-react';
import type { TaskStatus } from '@/types';

const STATUS_FILTERS: { label: string; value: TaskStatus | 'all' }[] = [
  { label: 'Alle', value: 'all' },
  { label: 'Aktiv', value: 'todo' },
  { label: 'I gang', value: 'in_progress' },
  { label: 'Færdig', value: 'done' },
];

export default function TasksPage() {
  const { tasks, groupConfig } = useApp();
  const [view, setView] = useState<'list' | 'person'>('person');
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [hideDone, setHideDone] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const members = groupConfig?.members ?? [];

  const tasksByMember = Object.fromEntries(
    members.map((member) => [
      member,
      tasks.filter((t) => t.assignedTo === member),
    ])
  );
  const unassigned = tasks.filter((t) => !t.assignedTo || t.assignedTo === '');

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);
  const sorted = [...filtered].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  );

  const openCount = tasks.filter((t) => t.status !== 'done').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="space-y-5 max-w-full">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opgaver</h1>
          <p className="text-sm text-gray-500 mt-1">
            {openCount} åbne · {doneCount} færdige
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Tilføj opgave
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 max-w-6xl mx-auto">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('person')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'person'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Per person
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Liste
          </button>
        </div>

        {view === 'person' ? (
          <button
            onClick={() => setHideDone(!hideDone)}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            {hideDone ? 'Vis færdige' : 'Skjul færdige'}
          </button>
        ) : (
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
        )}
      </div>

      {view === 'person' ? (
        <div className="overflow-x-auto pb-4 -mx-6 px-6">
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {members.map((member) => (
              <MemberColumn
                key={member}
                member={member}
                tasks={tasksByMember[member] ?? []}
                hideDone={hideDone}
              />
            ))}
            <MemberColumn
              member="Ikke tildelt"
              tasks={unassigned}
              hideDone={hideDone}
            />
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
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
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Tilføj ny opgave">
        <AddTaskForm onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
