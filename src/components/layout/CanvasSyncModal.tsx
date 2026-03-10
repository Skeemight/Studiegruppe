'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { RefreshCw, ExternalLink, ChevronLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  canvasFetch,
  runCanvasSync,
  CANVAS_URL_KEY,
  CANVAS_TOKEN_KEY,
  CANVAS_SELECTED_KEY,
  CANVAS_LAST_SYNC_KEY,
  getMergeRules,
  deleteMergeRule,
  type MergeRule,
  type SyncResult,
} from '@/lib/canvasApi';
import { generateActivityAfterSync } from '@/lib/activityFeed';

interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  workflow_state: string;
  start_at: string | null;
  end_at: string | null;
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-mono';

type Step = 'settings' | 'select' | 'done';

interface Props {
  onClose: () => void;
}

export function CanvasSyncModal({ onClose }: Props) {
  const { upsertCourses, upsertTasks, upsertDocuments, upsertModules, pruneCanvasData, mergeCourses, documents, canvasModules, courses } = useApp();

  const [step, setStep] = useState<Step>('settings');
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [availableCourses, setAvailableCourses] = useState<CanvasCourse[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<SyncResult | null>(null);
  const [mergeRules, setMergeRules] = useState<MergeRule[]>(() => getMergeRules());

  useEffect(() => {
    setUrl(localStorage.getItem(CANVAS_URL_KEY) ?? '');
    setToken(localStorage.getItem(CANVAS_TOKEN_KEY) ?? '');
    const saved = localStorage.getItem(CANVAS_SELECTED_KEY);
    if (saved) {
      try { setSelectedIds(new Set(JSON.parse(saved) as number[])); } catch { /* ignore */ }
    }
  }, []);

  async function handleFetchCourses() {
    const cleanUrl = url.trim().replace(/\/$/, '');
    const cleanToken = token.trim();
    if (!cleanUrl || !cleanToken) { setError('Udfyld både Canvas URL og token.'); return; }
    setLoading(true);
    setError('');
    try {
      localStorage.setItem(CANVAS_URL_KEY, cleanUrl);
      localStorage.setItem(CANVAS_TOKEN_KEY, cleanToken);
      const courses = await canvasFetch<CanvasCourse[]>(cleanUrl, cleanToken, 'courses');
      setAvailableCourses(courses);
      const saved = localStorage.getItem(CANVAS_SELECTED_KEY);
      if (saved) {
        const savedIds = new Set(JSON.parse(saved) as number[]);
        setSelectedIds(new Set(courses.filter((c) => savedIds.has(c.id)).map((c) => c.id)));
      } else {
        setSelectedIds(new Set(courses.map((c) => c.id)));
      }
      setStep('select');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl');
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (selectedIds.size === 0) { setError('Vælg mindst ét fag.'); return; }
    localStorage.setItem(CANVAS_SELECTED_KEY, JSON.stringify([...selectedIds]));
    setLoading(true);
    setError('');
    const prevDocs = documents;
    const prevModules = canvasModules;
    let nextDocs = prevDocs;
    let nextModules = prevModules;
    try {
      const res = await runCanvasSync(
        url.trim().replace(/\/$/, ''),
        token.trim(),
        selectedIds,
        {
          upsertCourses,
          upsertTasks,
          upsertDocuments: (docs) => { nextDocs = docs; upsertDocuments(docs); },
          upsertModules: (mods) => { nextModules = mods; upsertModules(mods); },
          pruneCanvasData,
        }
      );

      // Apply saved merge rules
      for (const rule of getMergeRules()) {
        mergeCourses(rule.keepId, rule.removeId, rule.name);
      }

      localStorage.setItem(CANVAS_LAST_SYNC_KEY, new Date().toISOString());
      generateActivityAfterSync(prevDocs, prevModules, nextDocs, nextModules, courses);
      setResult(res);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl');
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteRule(keepId: string, removeId: string) {
    deleteMergeRule(keepId, removeId);
    setMergeRules(getMergeRules());
  }

  function toggleCourse(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (step === 'done' && result) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-4 text-sm text-green-700 text-center space-y-1">
          <p className="font-semibold">Sync fuldført</p>
          <p>
            <strong>{result.courses} fag</strong>,{' '}
            <strong>{result.tasks} afleveringer</strong>,{' '}
            <strong>{result.docs} filer</strong> og{' '}
            <strong>{result.modules} moduler</strong> importeret.
          </p>
        </div>

        {result.fileErrors.length > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-amber-700">
              Filer kunne ikke hentes for {result.fileErrors.length} {result.fileErrors.length === 1 ? 'fag' : 'fag'}:
            </p>
            {result.fileErrors.map((e) => (
              <div key={e.courseName} className="text-xs text-amber-600">
                <span className="font-medium">{e.courseName}</span>
                {' — '}{e.reason.includes('403') || e.reason.includes('401')
                  ? 'Filer-fanen er slået fra for dette kursus på Canvas'
                  : e.reason}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setStep('settings'); setResult(null); }} className="flex-1">
            Juster indstillinger
          </Button>
          <Button onClick={onClose} className="flex-1">Luk</Button>
        </div>
      </div>
    );
  }

  if (step === 'select') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep('settings')} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-sm text-gray-600">
            Vælg hvilke fag der skal synkes. Dit valg huskes til næste gang.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
          <span>{availableCourses.length} fag fundet på Canvas</span>
          <button
            onClick={() =>
              selectedIds.size === availableCourses.length
                ? setSelectedIds(new Set())
                : setSelectedIds(new Set(availableCourses.map((c) => c.id)))
            }
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {selectedIds.size === availableCourses.length ? 'Fravælg alle' : 'Vælg alle'}
          </button>
        </div>

        <ul className="max-h-72 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
          {[...availableCourses]
            .sort((a, b) => {
              const order = (c: CanvasCourse) =>
                c.workflow_state === 'available' ? 0 : c.workflow_state === 'completed' ? 2 : 1;
              return order(a) - order(b);
            })
            .map((course) => {
              const isCompleted = course.workflow_state === 'completed';
              const year = course.start_at
                ? new Date(course.start_at).getFullYear()
                : course.end_at ? new Date(course.end_at).getFullYear() : null;
              return (
                <li key={course.id}>
                  <label className={`flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer ${isCompleted ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(course.id)}
                      onChange={() => toggleCourse(course.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 truncate">{course.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        {course.course_code && <span className="font-mono">{course.course_code}</span>}
                        {year && <span>{year}</span>}
                        {isCompleted && <span className="text-orange-400 font-medium">Afsluttet</span>}
                      </p>
                    </div>
                  </label>
                </li>
              );
            })}
        </ul>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSync}
            disabled={loading || selectedIds.size === 0}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Synkroniserer…' : `Sync ${selectedIds.size} fag`}
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">Annuller</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-sm text-gray-600">
          Hent fag og afleveringer fra Canvas. Du vælger selv hvilke fag der synkes.
        </p>
        <a
          href={url ? `${url}/profile/settings` : '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
        >
          Generer token under Konto → Indstillinger <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Canvas URL</label>
          <input
            className={inputClass}
            placeholder="https://cbscanvas.instructure.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Personligt adgangstoken</label>
          <input
            type="password"
            className={inputClass}
            placeholder="••••••••••••••••••••••"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Gemmes kun lokalt i din browser.</p>
        </div>
      </div>

      {mergeRules.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1.5">Automatiske sammenfletninger</p>
          <ul className="rounded-lg border border-gray-100 divide-y divide-gray-50">
            {mergeRules.map((rule) => (
              <li key={`${rule.keepId}-${rule.removeId}`} className="flex items-center gap-2 px-3 py-2">
                <span className="text-xs text-gray-500 flex-1 min-w-0 truncate">
                  <span className="text-gray-400">{rule.removeName}</span>
                  {' → '}
                  <span className="font-medium text-gray-700">{rule.name}</span>
                </span>
                <button
                  onClick={() => handleDeleteRule(rule.keepId, rule.removeId)}
                  className="p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
                  title="Fjern regel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          onClick={handleFetchCourses}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Henter fag…' : 'Hent fag fra Canvas'}
        </Button>
        <Button variant="secondary" onClick={onClose} className="flex-1">Annuller</Button>
      </div>
    </div>
  );
}
