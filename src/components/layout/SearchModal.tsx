'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import { BookOpen, CheckSquare, FileText, GraduationCap, CalendarClock, NotebookText, Search, X } from 'lucide-react';
import { getCourseColor } from '@/lib/courseColors';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  externalUrl?: string;
  type: 'fag' | 'opgave' | 'dokument' | 'eksamen' | 'møde' | 'note';
  courseColor?: string;
}

const TYPE_ICON = {
  fag: GraduationCap,
  opgave: CheckSquare,
  dokument: FileText,
  eksamen: BookOpen,
  møde: CalendarClock,
  note: NotebookText,
};

const TYPE_LABEL = {
  fag: 'Fag',
  opgave: 'Opgave',
  dokument: 'Dokument',
  eksamen: 'Eksamen',
  møde: 'Møde',
  note: 'Note',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: Props) {
  const { courses, tasks, documents, exams, meetings, notes, getCourseById } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches: SearchResult[] = [];

    courses.forEach((c) => {
      if (c.name.toLowerCase().includes(q) || c.semester?.toLowerCase().includes(q)) {
        matches.push({ id: c.id, title: c.name, subtitle: c.semester, href: `/fag/${c.id}`, type: 'fag', courseColor: c.color });
      }
    });

    tasks.forEach((t) => {
      if (t.title.toLowerCase().includes(q)) {
        const course = getCourseById(t.courseId);
        matches.push({ id: t.id, title: t.title, subtitle: course?.name, href: '/tasks', externalUrl: t.url || undefined, type: 'opgave', courseColor: course?.color });
      }
    });

    documents.forEach((d) => {
      if (d.title.toLowerCase().includes(q) || d.tags.some((tag) => tag.toLowerCase().includes(q))) {
        const course = getCourseById(d.courseId);
        matches.push({ id: d.id, title: d.title, subtitle: course?.name, href: '/documents', externalUrl: d.url || undefined, type: 'dokument', courseColor: course?.color });
      }
    });

    exams.forEach((e) => {
      const course = getCourseById(e.courseId);
      const courseName = course?.name ?? '';
      if (courseName.toLowerCase().includes(q) || e.notes?.toLowerCase().includes(q)) {
        matches.push({ id: e.id, title: courseName || 'Eksamen', subtitle: e.date, href: '/exams', type: 'eksamen', courseColor: course?.color });
      }
    });

    meetings.forEach((m) => {
      if (m.title.toLowerCase().includes(q) || m.agenda?.some((a) => a.toLowerCase().includes(q))) {
        matches.push({ id: m.id, title: m.title, subtitle: m.date, href: '/meetings', type: 'møde' });
      }
    });

    notes.forEach((n) => {
      if (n.title.toLowerCase().includes(q) || n.week?.toLowerCase().includes(q) || n.tags?.some((t) => t.toLowerCase().includes(q))) {
        const course = getCourseById(n.courseId);
        matches.push({ id: n.id, title: n.title, subtitle: course?.name, href: '/notes', type: 'note', courseColor: course?.color });
      }
    });

    return matches.slice(0, 20);
  }, [query, courses, tasks, documents, exams, meetings, notes, getCourseById]);

  useEffect(() => { setSelected(0); }, [results]);

  function navigate(result: SearchResult) {
    if (result.externalUrl) {
      window.open(result.externalUrl, '_blank', 'noopener,noreferrer');
      onClose();
      return;
    }
    router.push(result.href);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && results[selected]) {
      navigate(results[selected]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Søg i opgaver, dokumenter, noter…"
            className="flex-1 text-sm outline-none text-gray-900 placeholder:text-gray-400 bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {query && (
          <div className="max-h-80 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Ingen resultater for &quot;{query}&quot;</p>
            ) : (
              <ul ref={listRef}>
                {results.map((r, i) => {
                  const Icon = TYPE_ICON[r.type];
                  const colors = getCourseColor(r.courseColor);
                  return (
                    <li key={`${r.type}-${r.id}`}>
                      <button
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        onClick={() => navigate(r)}
                        onMouseEnter={() => setSelected(i)}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${r.courseColor ? colors.light : 'bg-gray-100'}`}>
                          <Icon className={`w-3.5 h-3.5 ${r.courseColor ? colors.text : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                          {r.subtitle && (
                            <p className="text-xs text-gray-400 truncate">{r.subtitle}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium shrink-0 uppercase tracking-wide">
                          {TYPE_LABEL[r.type]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {!query && (
          <div className="px-4 py-5 text-center text-gray-400">
            <p className="text-sm">Skriv for at søge på tværs af alt indhold</p>
            <p className="text-xs mt-1">Opgaver · Dokumenter · Fag · Eksamener · Møder · Noter</p>
          </div>
        )}
      </div>
    </div>
  );
}
