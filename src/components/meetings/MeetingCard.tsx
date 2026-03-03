'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CalendarClock, Pencil, Trash2 } from 'lucide-react';
import type { Meeting } from '@/types';

interface MeetingCardProps {
  meeting: Meeting;
  onEdit: (meeting: Meeting) => void;
  onDelete: (id: string) => void;
}

export function MeetingCard({ meeting, onEdit, onDelete }: MeetingCardProps) {
  const meetingDate = new Date(meeting.date);
  const isPast = meetingDate < new Date();

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarClock className={`w-4 h-4 ${isPast ? 'text-gray-400' : 'text-blue-600'}`} />
            <p className="font-semibold text-gray-900 truncate">{meeting.title}</p>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {meetingDate.toLocaleString('da-DK', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            · {meeting.location}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onEdit(meeting)} className="p-1.5">
            <Pencil className="w-4 h-4 text-gray-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(meeting.id)}
            className="text-red-400 hover:bg-red-50 p-1.5"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {meeting.agenda.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Agenda</p>
          <ul className="space-y-1.5 text-sm text-gray-700">
            {meeting.agenda.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {meeting.decisions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Beslutninger</p>
          <ul className="space-y-1.5 text-sm text-gray-700">
            {meeting.decisions.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
