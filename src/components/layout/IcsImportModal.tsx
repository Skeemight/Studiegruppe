'use client';

import { useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';
import { parseICS } from '@/lib/icsParser';
import type { ScheduleEvent } from '@/types';
import { CalendarDays, Upload, X } from 'lucide-react';

interface IcsImportModalProps {
  onClose: () => void;
}

export function IcsImportModal({ onClose }: IcsImportModalProps) {
  const { setScheduleEvents, scheduleEvents } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ScheduleEvent[] | null>(null);
  const [fileName, setFileName] = useState('');

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseICS(reader.result as string);
      setPreview(parsed);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }

  function handleImport() {
    if (!preview) return;
    setScheduleEvents(preview);
    onClose();
  }

  function handleClear() {
    setScheduleEvents([]);
    onClose();
  }

  const dateRange = preview && preview.length > 0
    ? (() => {
        const fmt = (s: string) => new Date(s).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
        return `${fmt(preview[0].start)} – ${fmt(preview[preview.length - 1].start)}`;
      })()
    : null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-gray-600">
          Eksportér dit skema som <strong>.ics</strong>-fil fra Outlook, SharePoint eller din kalender-app, og importer det her.
        </p>
        {scheduleEvents.length > 0 && !preview && (
          <p className="text-xs text-blue-600 mt-2 bg-blue-50 rounded-lg px-3 py-2">
            {scheduleEvents.length} skema-events er allerede importeret. Import af en ny fil erstatter dem.
          </p>
        )}
      </div>

      {!preview ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-colors"
        >
          <Upload className="w-6 h-6" />
          <span className="text-sm font-medium">Klik for at vælge .ics-fil</span>
          <span className="text-xs">iCalendar-format (.ics)</span>
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-start gap-3">
            <CalendarDays className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{preview.length} events fundet</p>
              <p className="text-xs text-gray-500 mt-0.5">{fileName}</p>
              {dateRange && <p className="text-xs text-gray-500">{dateRange}</p>}
            </div>
            <button onClick={() => { setPreview(null); setFileName(''); }} className="ml-auto text-gray-300 hover:text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>

          {preview.length > 0 && (
            <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {preview.slice(0, 8).map((ev) => (
                <li key={ev.id} className="text-xs text-gray-600 flex items-center gap-2">
                  <span className="text-gray-300 shrink-0">
                    {new Date(ev.start).toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' '}
                    {new Date(ev.start).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="truncate">{ev.title}</span>
                </li>
              ))}
              {preview.length > 8 && (
                <li className="text-xs text-gray-400 italic">...og {preview.length - 8} mere</li>
              )}
            </ul>
          )}

          {preview.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Ingen events fundet i filen.</p>
          )}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".ics" className="hidden" onChange={handleFile} />

      <div className="flex gap-2 pt-1">
        {preview && preview.length > 0 && (
          <Button className="flex-1" onClick={handleImport}>
            Importer {preview.length} events
          </Button>
        )}
        {scheduleEvents.length > 0 && !preview && (
          <Button variant="secondary" onClick={handleClear} className="text-red-500 hover:bg-red-50">
            Ryd skema
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} className={preview && preview.length > 0 ? '' : 'flex-1'}>
          Annuller
        </Button>
      </div>
    </div>
  );
}
