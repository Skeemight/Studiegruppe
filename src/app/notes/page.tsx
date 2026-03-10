'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { NoteCard } from '@/components/notes/NoteCard';
import { AddNoteForm } from '@/components/notes/AddNoteForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import type { NoteFormat, StudyNote } from '@/types';

type NoteFilter = 'all' | NoteFormat;

function sortByWeekLabel(a: string, b: string) {
  const aMatch = a.match(/\d+/);
  const bMatch = b.match(/\d+/);
  if (aMatch && bMatch) return Number(aMatch[0]) - Number(bMatch[0]);
  return a.localeCompare(b, 'da');
}

function formatWeekLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^uge\s+\d+$/i.test(trimmed)) return `Uge ${trimmed.match(/\d+/)?.[0] ?? trimmed}`;
  if (/^\d+$/.test(trimmed)) return `Uge ${trimmed}`;
  return trimmed;
}

export default function NotesPage() {
  const { notes, courses, getCourseById } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<NoteFilter>('all');
  const [search, setSearch] = useState('');

  const filteredNotes = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return notes.filter((note) => {
      if (courseFilter !== 'all' && note.courseId !== courseFilter) return false;
      if (weekFilter !== 'all' && note.week !== weekFilter) return false;
      if (formatFilter !== 'all' && note.format !== formatFilter) return false;
      if (!needle) return true;
      return (
        note.title.toLowerCase().includes(needle) ||
        note.week.toLowerCase().includes(needle) ||
        note.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [courseFilter, formatFilter, notes, search, weekFilter]);

  const weeks = useMemo(
    () => Array.from(new Set(notes.map((note) => note.week))).sort(sortByWeekLabel),
    [notes]
  );

  const groupedByCourseWeek = useMemo(() => {
    const courseMap = new Map<string, Map<string, StudyNote[]>>();
    for (const note of filteredNotes) {
      if (!courseMap.has(note.courseId)) courseMap.set(note.courseId, new Map());
      const weekMap = courseMap.get(note.courseId)!;
      if (!weekMap.has(note.week)) weekMap.set(note.week, []);
      weekMap.get(note.week)!.push(note);
    }

    return Array.from(courseMap.entries())
      .map(([courseId, weekMap]) => ({
        courseId,
        courseName: getCourseById(courseId)?.name ?? 'Ukendt fag',
        weeks: Array.from(weekMap.entries())
          .sort(([weekA], [weekB]) => sortByWeekLabel(weekA, weekB))
          .map(([week, courseWeekNotes]) => ({
            week,
            notes: courseWeekNotes.sort((a, b) => a.title.localeCompare(b.title, 'da')),
          })),
      }))
      .sort((a, b) => a.courseName.localeCompare(b.courseName, 'da'));
  }, [filteredNotes, getCourseById]);

  return (
    <div className="space-y-6 max-w-[780px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[32px] leading-tight" style={{ color: 'var(--text-primary)' }}>Noter</h1>
          <p className="font-mono text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{notes.length} noter samlet</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Tilføj note
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white md:col-span-2"
          placeholder="Søg i titel, uge eller tags"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
        >
          <option value="all">Alle fag</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>

        <select
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          value={weekFilter}
          onChange={(e) => setWeekFilter(e.target.value)}
        >
          <option value="all">Alle uger</option>
          {weeks.map((week) => (
            <option key={week} value={week}>
              {formatWeekLabel(week)}
            </option>
          ))}
        </select>

        <select
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value as NoteFilter)}
        >
          <option value="all">Alle formater</option>
          <option value="pdf">PDF</option>
          <option value="docx">DOCX</option>
          <option value="pptx">PPTX</option>
          <option value="xlsx">XLSX</option>
          <option value="txt">TXT</option>
          <option value="link">Link</option>
          <option value="andet">Andet</option>
        </select>
      </div>

      {groupedByCourseWeek.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">Ingen noter fundet</p>
          <p className="text-sm mt-1">Tilføj noter og organiser dem uge for uge pr. fag.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByCourseWeek.map((courseGroup) => (
            <section key={courseGroup.courseId} className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">{courseGroup.courseName}</h2>
              {courseGroup.weeks.map((weekGroup) => (
                <div key={weekGroup.week} className="space-y-3">
                  <p className="text-sm font-medium text-gray-600">{formatWeekLabel(weekGroup.week)}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {weekGroup.notes.map((note) => (
                      <NoteCard key={note.id} note={note} />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Tilføj note">
        <AddNoteForm onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
