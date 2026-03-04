'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/store/AppContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Link2, Check, Calendar, BookOpen, ArrowRight, Wand2 } from 'lucide-react';
import type { Course } from '@/types';

// Same fuzzy matcher used on the Today and Calendar pages
function matchEventToCourse(title: string, courses: Course[]): Course | undefined {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[()[\]:,./\\-]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = (s: string) => norm(s).split(' ').filter((w) => w.length > 3);
  const titleWords = words(title);
  if (titleWords.length === 0) return undefined;
  let best: Course | undefined;
  let bestScore = 0;
  for (const course of courses) {
    const cWords = words(course.name);
    let matches = 0;
    for (const cw of cWords) {
      if (titleWords.some((tw) => tw.startsWith(cw) || cw.startsWith(tw))) matches++;
    }
    const score = matches / Math.max(cWords.length, 1);
    if (score > bestScore && matches >= 1) { bestScore = score; best = course; }
  }
  return best;
}

export default function SettingsPage() {
  const { scheduleEvents, courses } = useApp();
  const [courseMapping, setCourseMapping] = useLocalStorage<Record<string, string>>('sg_course_mapping', {});
  const hasAutoApplied = useRef(false);

  // Unique event titles with occurrence count
  const uniqueTitles = useMemo(() => {
    const seen = new Set<string>();
    const titles: { title: string; count: number }[] = [];
    scheduleEvents.forEach((e) => {
      if (!seen.has(e.title)) {
        seen.add(e.title);
        titles.push({ title: e.title, count: scheduleEvents.filter((x) => x.title === e.title).length });
      }
    });
    return titles.sort((a, b) => a.title.localeCompare(b.title, 'da'));
  }, [scheduleEvents]);

  // Auto-suggestions via fuzzy matching (computed once per data change)
  const autoSuggestions = useMemo<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    uniqueTitles.forEach(({ title }) => {
      const match = matchEventToCourse(title, courses);
      if (match) result[title] = match.id;
    });
    return result;
  }, [uniqueTitles, courses]);

  // Auto-apply suggestions on first load — only for unmapped titles, never overwrite
  useEffect(() => {
    if (hasAutoApplied.current) return;
    if (Object.keys(autoSuggestions).length === 0) return;
    hasAutoApplied.current = true;
    setCourseMapping((prev) => {
      const next = { ...prev };
      Object.entries(autoSuggestions).forEach(([title, courseId]) => {
        if (!next[title]) next[title] = courseId;
      });
      return next;
    });
  }, [autoSuggestions, setCourseMapping]);

  function applyAutoMatchAll() {
    setCourseMapping((prev) => {
      const next = { ...prev };
      Object.entries(autoSuggestions).forEach(([title, courseId]) => {
        if (!next[title]) next[title] = courseId;
      });
      return next;
    });
  }

  function setMapping(title: string, courseId: string) {
    setCourseMapping((prev) => {
      if (!courseId) {
        const next = { ...prev };
        delete next[title];
        return next;
      }
      return { ...prev, [title]: courseId };
    });
  }

  // Split into matched (top) and unmatched (bottom)
  const matched = useMemo(
    () => uniqueTitles.filter(({ title }) => courseMapping[title]),
    [uniqueTitles, courseMapping]
  );
  const unmatched = useMemo(
    () => uniqueTitles.filter(({ title }) => !courseMapping[title]),
    [uniqueTitles, courseMapping]
  );

  const unmatchedAutoCount = unmatched.filter(({ title }) => autoSuggestions[title]).length;
  const mappedCount = matched.length;
  const allDone = mappedCount === uniqueTitles.length && uniqueTitles.length > 0;

  function renderRow(title: string, count: number, dimmed: boolean) {
    const mapped = courseMapping[title];
    const isAutoSuggested = !mapped && !!autoSuggestions[title];

    return (
      <li key={title} className={`px-6 py-4 flex items-center gap-4 ${dimmed ? 'opacity-60' : ''}`}>
        <div className={`w-2 h-2 rounded-full shrink-0 ${mapped ? 'bg-green-400' : 'bg-gray-200'}`} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {count} {count === 1 ? 'gang' : 'gange'} i skemaet
            {isAutoSuggested && (
              <span className="ml-2 text-blue-400 font-medium">· foreslår auto-match</span>
            )}
          </p>
        </div>

        <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />

        <div className="relative shrink-0 w-52">
          <select
            value={mapped ?? ''}
            onChange={(e) => setMapping(title, e.target.value)}
            className={`w-full pl-3 pr-8 py-2 text-sm border rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer
              ${mapped ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-500'}`}
          >
            <option value="">Vælg kursus…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {mapped && (
            <Check className="w-3.5 h-3.5 text-green-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Indstillinger</h1>
        <p className="text-sm text-gray-400 mt-0.5">Konfigurer appen for din studiegruppe</p>
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg shrink-0 mt-0.5">
                <Link2 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Kobl skema med Canvas-kurser</h2>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Forbind hvert hold fra dit ICS-skema med det tilsvarende Canvas-kursus,
                  så "I dag"-siden viser de rigtige materialer.
                </p>
              </div>
            </div>
            {uniqueTitles.length > 0 && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 mt-0.5 ${allDone ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {mappedCount}/{uniqueTitles.length}
              </span>
            )}
          </div>

          {/* Auto-match button */}
          {unmatched.length > 0 && unmatchedAutoCount > 0 && (
            <button
              onClick={applyAutoMatchAll}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Auto-match {unmatchedAutoCount} hold
            </button>
          )}
        </div>

        {scheduleEvents.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Ingen skema importeret endnu</p>
            <p className="text-xs text-gray-400 mt-1">
              Importer dit ICS-skema fra{' '}
              <a href="/calendar" className="text-blue-600 hover:underline">Tidslinje</a>{' '}
              for at se dine hold her.
            </p>
          </div>
        ) : courses.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Ingen Canvas-kurser synkroniseret</p>
            <p className="text-xs text-gray-400 mt-1">
              Synkroniser Canvas via{' '}
              <a href="/fag" className="text-blue-600 hover:underline">Fag</a>{' '}
              for at kunne koble dine hold.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {matched.map(({ title, count }) => renderRow(title, count, false))}
            {unmatched.length > 0 && matched.length > 0 && (
              <li className="px-6 py-2 bg-gray-50">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Ikke matchet — vælg manuelt
                </p>
              </li>
            )}
            {unmatched.map(({ title, count }) => renderRow(title, count, true))}
          </ul>
        )}

        {allDone && (
          <div className="px-6 py-3 bg-green-50 border-t border-green-100 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-xs text-green-700 font-medium">
              Alle hold er koblet — "I dag"-siden viser nu de rigtige Canvas-materialer.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
