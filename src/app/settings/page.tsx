'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Link2, Check, Calendar, BookOpen, ArrowRight, Wand2, HardDrive, Download, Upload, Copy } from 'lucide-react';
import { matchEventToCourse } from '@/lib/courseUtils';
import type { Course, ScheduleEvent } from '@/types';

export default function SettingsPage() {
  const { scheduleEvents, courses, exportData, importData, currentGroup, courseMapping, updateCourseMapping } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [importErrorMsg, setImportErrorMsg] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  function handleExport() {
    exportData();
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const json = reader.result as string;
      if (!window.confirm('Dette erstatter AL din nuværende data. Fortsæt?')) {
        e.target.value = '';
        return;
      }
      const result = importData(json);
      if (result.success) {
        setImportStatus('ok');
        setTimeout(() => setImportStatus('idle'), 3000);
      } else {
        setImportErrorMsg(result.error ?? 'Ukendt fejl');
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 4000);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  function copyInviteCode() {
    if (!currentGroup?.inviteCode) return;
    navigator.clipboard.writeText(currentGroup.inviteCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }
  const hasAutoApplied = useRef(false);

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
    Object.entries(autoSuggestions).forEach(([title, courseId]) => {
      if (!courseMapping[title]) updateCourseMapping(title, courseId);
    });
  }, [autoSuggestions, courseMapping, updateCourseMapping]);

  function applyAutoMatchAll() {
    Object.entries(autoSuggestions).forEach(([title, courseId]) => {
      if (!courseMapping[title]) updateCourseMapping(title, courseId);
    });
  }

  function setMapping(title: string, courseId: string) {
    updateCourseMapping(title, courseId);
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

  return (
    <div className="max-w-[780px] mx-auto space-y-8">
      <h1 className="font-serif text-[32px] leading-tight" style={{ color: 'var(--text-primary)' }}>Indstillinger</h1>

      <section className="bg-green-50 border border-green-100 rounded-2xl px-5 py-4 flex items-start gap-3">
        <HardDrive className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green-800">Data synkroniseres via Supabase</p>
          <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
            Al data — kurser, Canvas-sync, skema og indstillinger — er gemt i skyen og deles på tværs af alle gruppemedlemmer og enheder i realtid.
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
                  så &quot;I dag&quot;-siden viser de rigtige materialer.
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
              <a href="/calendar" className="text-blue-600 hover:underline">Kalender</a>{' '}
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
              Alle hold er koblet — &quot;I dag&quot;-siden viser nu de rigtige Canvas-materialer.
            </p>
          </div>
        )}
      </section>

      {/* ── Section 2: Invite code ── */}
      {currentGroup?.inviteCode && (
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-1">Invitationskode</h2>
            <p className="text-xs text-gray-500 mb-4">Del denne kode med dine gruppemedlemmer, så de kan join gruppen.</p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold tracking-widest text-gray-800">
                {currentGroup.inviteCode}
              </span>
              <button
                onClick={copyInviteCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {codeCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {codeCopied ? 'Kopieret!' : 'Kopiér'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 4: Data export/import ── */}
      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-1">Data</h2>
          <p className="text-xs text-gray-500 mb-4">
            Eksportér din data som JSON til backup, eller importer en tidligere eksport.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Eksportér JSON
            </button>
            <button
              onClick={handleImportClick}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Importer JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            {importStatus === 'ok' && (
              <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <Check className="w-3.5 h-3.5" />
                Data importeret
              </span>
            )}
            {importStatus === 'error' && (
              <span className="text-xs text-red-500">{importErrorMsg}</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
