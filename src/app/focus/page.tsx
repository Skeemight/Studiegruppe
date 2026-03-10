'use client';

import { useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { getCourseColor } from '@/lib/courseColors';
import { Check, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

const generateId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

function getMondayOfWeek(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

function weekKey(year: number, week: number): string {
  return `${year}-${String(week).padStart(2, '0')}`;
}

function parseWeekKey(key: string): { year: number; week: number } {
  const [y, w] = key.split('-').map(Number);
  return { year: y, week: w };
}

function formatWeekLabel(year: number, week: number): string {
  const monday = getMondayOfWeek(year, week);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `Uge ${week} · ${fmt(monday)}–${fmt(sunday)}`;
}

function offsetWeek(key: string, delta: number): string {
  const { year, week } = parseWeekKey(key);
  const monday = getMondayOfWeek(year, week);
  monday.setUTCDate(monday.getUTCDate() + delta * 7);
  const { week: newWeek, year: newYear } = getISOWeek(new Date(monday.getTime()));
  return weekKey(newYear, newWeek);
}

interface CourseSectionProps {
  courseId: string;
  currentWeek: string;
}

function CourseSection({ courseId, currentWeek }: CourseSectionProps) {
  const { courses, weekFocus, addWeekFocus, updateWeekFocus, deleteWeekFocus, getCourseById } = useApp();
  const course = getCourseById(courseId);
  const colors = getCourseColor(course?.color, courseId);
  const items = weekFocus.filter((f) => f.courseId === courseId && f.week === currentWeek);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function add() {
    const trimmed = text.trim();
    if (!trimmed) return;
    addWeekFocus({ week: currentWeek, courseId, text: trimmed, done: false });
    setText('');
    inputRef.current?.focus();
  }

  if (!course) return null;

  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${colors.border} px-4 py-3`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />
        <p className="text-sm font-semibold text-gray-900">{course.name}</p>
        {items.length > 0 && (
          <span className="ml-auto text-xs text-gray-400">
            {items.filter((f) => f.done).length}/{items.length}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <ul className="space-y-1 mb-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 group">
              <button
                onClick={() => updateWeekFocus(item.id, { done: !item.done })}
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  item.done ? `${colors.bg} border-transparent` : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {item.done && <Check className={`w-2.5 h-2.5 ${colors.text}`} />}
              </button>
              <span className={`text-sm flex-1 ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {item.text}
              </span>
              <button
                onClick={() => deleteWeekFocus(item.id)}
                className="p-0.5 rounded text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Tilføj fokusemne…"
          className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white placeholder:text-gray-300"
        />
        <button
          onClick={add}
          disabled={!text.trim()}
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function FocusPage() {
  const { courses, weekFocus } = useApp();
  const now = new Date();
  const { week, year } = getISOWeek(now);
  const currentKey = weekKey(year, week);
  const [selectedWeek, setSelectedWeek] = useState(currentKey);

  const { year: selYear, week: selWeek } = parseWeekKey(selectedWeek);
  const isPast = selectedWeek < currentKey;
  const isCurrent = selectedWeek === currentKey;

  const totalItems = weekFocus.filter((f) => f.week === selectedWeek).length;

  return (
    <div className="max-w-[780px] mx-auto space-y-6">
      <h1 className="font-serif text-[32px] leading-tight" style={{ color: 'var(--text-primary)' }}>Fokus</h1>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedWeek((k) => offsetWeek(k, -1))}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <span className={`text-sm font-semibold ${isCurrent ? 'text-blue-600' : 'text-gray-700'}`}>
            {formatWeekLabel(selYear, selWeek)}
          </span>
          {isCurrent && (
            <span className="ml-2 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
              Denne uge
            </span>
          )}
        </div>
        <button
          onClick={() => setSelectedWeek((k) => offsetWeek(k, 1))}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className={`space-y-3 ${isPast ? 'opacity-60' : ''}`}>
        {courses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Ingen fag oprettet endnu.</p>
        ) : totalItems === 0 && isPast ? (
          <p className="text-sm text-gray-400 text-center py-10">Ingen fokusemner denne uge.</p>
        ) : (
          courses.map((course) => (
            <CourseSection key={course.id} courseId={course.id} currentWeek={selectedWeek} />
          ))
        )}
      </div>
    </div>
  );
}
