'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { MeetingCard } from '@/components/meetings/MeetingCard';
import { MeetingForm } from '@/components/meetings/MeetingForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import type { Meeting } from '@/types';

export default function MeetingsPage() {
  const { meetings, addMeeting, updateMeeting, deleteMeeting } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  const sortedMeetings = useMemo(
    () => [...meetings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [meetings]
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Møder</h1>
          <p className="text-sm text-gray-500 mt-1">{meetings.length} planlagt</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Opret møde
        </Button>
      </div>

      {sortedMeetings.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">Ingen møder endnu</p>
          <p className="text-sm mt-1">Opret et møde med dato, agenda og beslutninger.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMeetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onEdit={setEditingMeeting}
              onDelete={deleteMeeting}
            />
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Opret møde">
        <MeetingForm
          submitLabel="Opret møde"
          onCancel={() => setShowCreate(false)}
          onSubmit={(payload) => {
            addMeeting(payload);
            setShowCreate(false);
          }}
        />
      </Modal>

      <Modal open={!!editingMeeting} onClose={() => setEditingMeeting(null)} title="Redigér møde">
        {editingMeeting && (
          <MeetingForm
            initialMeeting={editingMeeting}
            submitLabel="Gem ændringer"
            onCancel={() => setEditingMeeting(null)}
            onSubmit={(payload) => {
              updateMeeting(editingMeeting.id, payload);
              setEditingMeeting(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
