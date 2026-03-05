'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Link2, Check, Calendar, BookOpen, ArrowRight, Wand2, HardDrive, Layers, ChevronUp, ChevronDown, Zap } from 'lucide-react';
import type { Course, ScheduleEvent, CanvasModule } from '@/types';

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

function fmtEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('da-DK', {
    weekday: 'short', day: 'numeric', month: 'short',
  }) + ' ' + new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
}

export default function SettingsPage() {
  const { scheduleEvents, courses, canvasModules } = useApp();
  const [courseMapping, setCourseMapping] = useLocalStorage<Record<string, string>>('sg_course_mapping', {});
  const [savedMap, setSavedMap] = useLocalStorage<Record<string, string>>('sg_lesson_module_map', {});
  const [draft, setDraft] = useState<Record<string, string>>(() => savedMap);
  const [saveFlash, setSaveFlash] = useState(false);
  const hasAutoApplied = useRef(false);

  // Sync draft when savedMap changes externally (e.g. first load)
  const savedMapRef = useRef(savedMap);
  useEffect(() => {
    if (JSON.stringify(savedMapRef.current) !== JSON.stringify(savedMap)) {
      savedMapRef.current = savedMap;
      setDraft(savedMap);
    }
  }, [savedMap]);

  // ── Course-title mapping ──────────────────────────────────────────────────

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

  const autoSuggestions = useMemo<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    uniqueTitles.forEach(({ title }) => {
      const match = matchEventToCourse(title, courses);
      if (match) result[title] = match.id;
    });
    return result;
  }, [uniqueTitles, courses]);

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

  // ── Lesson-module mapping ─────────────────────────────────────────────────

  function eventsForCourse(courseId: string): ScheduleEvent[] {
    return scheduleEvents
      .filter((e) => courseMapping[e.title] === courseId)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  function modulesForCourse(courseId: string): CanvasModule[] {
    return canvasModules
      .filter((m) => m.courseId === courseId)
      .sort((a, b) => a.position - b.position);
  }

  const mappableCourses = useMemo(
    () =>
      courses.filter(
        (c) =>
          scheduleEvents.some((e) => courseMapping[e.title] === c.id) &&
          canvasModules.some((m) => m.courseId === c.id)
      ),
    [courses, scheduleEvents, courseMapping, canvasModules]
  );

  function autoPairCourse(courseId: string) {
    const events = eventsForCourse(courseId);
    const modules = modulesForCourse(courseId);
    const pairs: Record<string, string> = {};
    events.forEach((ev, i) => { if (modules[i]) pairs[ev.id] = modules[i].id; });
    setDraft((prev) => ({ ...prev, ...pairs }));
  }

  function autoPairAll() {
    const allPairs: Record<string, string> = {};
    mappableCourses.forEach((c) => {
      const events = eventsForCourse(c.id);
      const modules = modulesForCourse(c.id);
      events.forEach((ev, i) => { if (modules[i]) allPairs[ev.id] = modules[i].id; });
    });
    setDraft((prev) => ({ ...prev, ...allPairs }));
  }

  function shiftModule(courseId: string, eventIndex: number, dir: -1 | 1) {
    const events = eventsForCourse(courseId);
    const swapIdx = eventIndex + dir;
    if (swapIdx < 0 || swapIdx >= events.length) return;
    const idA = events[eventIndex].id;
    const idB = events[swapIdx].id;
    setDraft((prev) => ({
      ...prev,
      [idA]: prev[idB] ?? '',
      [idB]: prev[idA] ?? '',
    }));
  }

  function setDraftPair(eventId: string, moduleId: string) {
    setDraft((prev) => {
      if (!moduleId) {
        const next = { ...prev };
        delete next[eventId];
        return next;
      }
      return { ...prev, [eventId]: moduleId };
    });
  }

  function saveMapping() {
    setSavedMap(draft);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  }

  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedMap);

  const totalPaired = mappableCourses.reduce(
    (sum, c) => sum + eventsForCourse(c.id).filter((e) => draft[e.id]).length,
    0
  );
  const totalEvents = mappableCourses.reduce(
    (sum, c) => sum + eventsForCourse(c.id).length,
    0
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Indstillinger</h1>
        <p className="text-sm text-gray-400 mt-0.5">Konfigurer appen for din studiegruppe</p>
      </div>

      <section className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 flex items-start gap-3">
        <HardDrive className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Data gemmes lokalt i din browser</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            Al data — Canvas-sync, skema og indstillinger — er gemt i browserens localStorage. Det betyder, at data ikke følger med til andre enheder eller browsere. Cross-device sync er på vej.
          </p>
        </div>
      </section>

      {/* ── Section 1: Course-title mapping ── */}
      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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

      {/* ── Section 2: Lesson-module mapping ── */}
      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-50 rounded-lg shrink-0 mt-0.5">
                <Layers className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Kobl lektioner til Canvas-moduler</h2>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Parrer hver lektion kronologisk med det tilsvarende Canvas-modul, så "I dag"-siden
                  viser præcis de rigtige materialer for dagens undervisning.
                </p>
              </div>
            </div>
            {totalEvents > 0 && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 mt-0.5 ${totalPaired === totalEvents ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {totalPaired}/{totalEvents}
              </span>
            )}
          </div>

          {mappableCourses.length > 0 && (
            <button
              onClick={autoPairAll}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Auto-par alle kurser
            </button>
          )}
        </div>

        {mappableCourses.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Layers className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Intet at koble endnu</p>
            <p className="text-xs text-gray-400 mt-1">
              Synkroniser Canvas (for at hente moduler) og importer et ICS-skema,
              og kobl derefter hold med kurser ovenfor.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {mappableCourses.map((course) => {
                const events = eventsForCourse(course.id);
                const modules = modulesForCourse(course.id);
                return (
                  <div key={course.id}>
                    <div className="px-6 py-3 bg-gray-50 flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-600">{course.name}</p>
                      <button
                        onClick={() => autoPairCourse(course.id)}
                        className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                      >
                        Auto-par
                      </button>
                    </div>
                    <ul className="divide-y divide-gray-50">
                      {events.map((event, idx) => {
                        const pairedModuleId = draft[event.id] ?? '';
                        return (
                          <li key={event.id} className="px-6 py-3 flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${pairedModuleId ? 'bg-green-400' : 'bg-gray-200'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">{event.title}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">{fmtEventDate(event.start)}</p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                            <div className="shrink-0 w-52">
                              <select
                                value={pairedModuleId}
                                onChange={(e) => setDraftPair(event.id, e.target.value)}
                                className={`w-full pl-3 pr-8 py-2 text-xs border rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer
                                  ${pairedModuleId ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-500'}`}
                              >
                                <option value="">Vælg modul…</option>
                                {modules.map((m) => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col shrink-0">
                              <button
                                onClick={() => shiftModule(course.id, idx, -1)}
                                disabled={idx === 0}
                                className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-20 disabled:cursor-not-allowed"
                                title="Flyt modul op"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => shiftModule(course.id, idx, 1)}
                                disabled={idx === events.length - 1}
                                className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-20 disabled:cursor-not-allowed"
                                title="Flyt modul ned"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-end gap-3">
              {saveFlash && (
                <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  Gemt
                </span>
              )}
              <button
                onClick={saveMapping}
                disabled={!isDirty}
                className="px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Gem mapping
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
