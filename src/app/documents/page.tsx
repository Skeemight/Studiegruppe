'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { AddDocumentForm } from '@/components/documents/AddDocumentForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, ChevronDown, ExternalLink, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import type { Document } from '@/types';
import { CANVAS_FILE_ERRORS_KEY, type FileError } from '@/lib/canvasApi';
import { getCourseColor } from '@/lib/courseColors';

type SortMode = 'fag' | 'dato' | 'navn' | 'type';

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'fag', label: 'Fag' },
  { key: 'dato', label: 'Dato' },
  { key: 'navn', label: 'Navn' },
  { key: 'type', label: 'Filtype' },
];

const FILE_ICON: Record<string, string> = {
  pdf: '📄', pptx: '📊', ppt: '📊', docx: '📝', doc: '📝',
  xlsx: '📊', xls: '📊', zip: '🗜', mp4: '🎥', mp3: '🎵',
};

function fileIcon(tags: string[]) {
  for (const tag of tags) { if (FILE_ICON[tag]) return FILE_ICON[tag]; }
  return '📎';
}

function DocRow({ doc, subtitle, onDelete }: { doc: Document; subtitle?: string; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 group">
      <span className="text-base shrink-0">{fileIcon(doc.tags)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 truncate">{doc.title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {doc.tags.map((tag) => (
        <span key={tag} className="hidden sm:inline text-xs text-gray-400 font-mono uppercase shrink-0">
          {tag}
        </span>
      ))}
      {doc.createdAt && (
        <span className="hidden md:inline text-xs text-gray-300 tabular-nums shrink-0">
          {new Date(doc.createdAt).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: '2-digit' })}
        </span>
      )}
      <a
        href={doc.url}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 rounded text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
        title="Åbn"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <button
        onClick={onDelete}
        className="p-1.5 rounded text-gray-200 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
        title="Slet"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function DocSection({ label, count, docs, getSubtitle, onDelete, defaultOpen, fileError, courseColor }: {
  label: string; count: number; docs: Document[];
  getSubtitle?: (doc: Document) => string | undefined;
  onDelete: (id: string) => void; defaultOpen?: boolean;
  fileError?: string; courseColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const colors = getCourseColor(courseColor);
  return (
    <div className={`bg-white rounded-xl border border-gray-100 overflow-hidden border-l-4 ${courseColor ? colors.border : 'border-l-transparent'}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${open ? '' : '-rotate-90'}`} />
          <span className="font-semibold text-gray-900 text-sm">{label}</span>
          {fileError && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">
              <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
              Filer ikke tilgængelige
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{count} filer</span>
      </button>
      {open && (
        <div className="px-4 border-t border-gray-50">
          {fileError && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600 py-2.5 border-b border-gray-50">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              Filer ikke tilgængelige — instruktøren har begrænset adgang på Canvas.
            </p>
          )}
          {docs.map((doc) => (
            <DocRow key={doc.id} doc={doc} subtitle={getSubtitle?.(doc)} onDelete={() => onDelete(doc.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  const { documents, courses, deleteDocument } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [sort, setSort] = useState<SortMode>('fag');
  const [filterCourses, setFilterCourses] = useState<Set<string>>(new Set());
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [fileErrors, setFileErrors] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CANVAS_FILE_ERRORS_KEY);
      if (!raw) return;
      const errors = JSON.parse(raw) as FileError[];
      setFileErrors(new Map(errors.map((e) => [e.courseId, e.reason])));
    } catch { /* ignore */ }
  }, []);

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const availableCourses = useMemo(() =>
    courses.filter((c) => documents.some((d) => d.courseId === c.id)),
    [courses, documents]
  );
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    documents.forEach((d) => { if (d.tags[0]) types.add(d.tags[0]); });
    return Array.from(types).sort();
  }, [documents]);

  function toggleCourse(id: string) {
    setFilterCourses((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleType(type: string) {
    setFilterTypes((prev) => { const s = new Set(prev); s.has(type) ? s.delete(type) : s.add(type); return s; });
  }
  function clearFilters() { setFilterCourses(new Set()); setFilterTypes(new Set()); }

  const activeFilterCount = filterCourses.size + filterTypes.size;
  const hasFilters = activeFilterCount > 0;

  const filtered = useMemo(() => documents.filter((d) => {
    const courseMatch = filterCourses.size === 0 || filterCourses.has(d.courseId);
    const typeMatch = filterTypes.size === 0 || d.tags.some((t) => filterTypes.has(t));
    return courseMatch && typeMatch;
  }), [documents, filterCourses, filterTypes]);

  const sections = useMemo(() => {
    const sorted = [...filtered];
    if (sort === 'fag') {
      const groups = new Map<string, Document[]>();
      courses.forEach((c) => groups.set(c.id, []));
      groups.set('__none__', []);
      sorted.forEach((d) => { const key = courseMap.has(d.courseId) ? d.courseId : '__none__'; groups.get(key)!.push(d); });
      return Array.from(groups.entries())
        .filter(([, docs]) => docs.length > 0)
        .map(([key, docs]) => {
          const course = key === '__none__' ? undefined : courseMap.get(key);
          return { key, label: course?.name ?? 'Uden fag', courseColor: course?.color, docs: docs.sort((a, b) => a.title.localeCompare(b.title, 'da')) };
        });
    }
    if (sort === 'dato') {
      sorted.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
      return [{ key: 'all', label: 'Alle filer', courseColor: undefined, docs: sorted }];
    }
    if (sort === 'navn') {
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'da'));
      return [{ key: 'all', label: 'Alle filer', courseColor: undefined, docs: sorted }];
    }
    if (sort === 'type') {
      const groups = new Map<string, Document[]>();
      sorted.forEach((d) => { const ext = d.tags[0] ?? 'andet'; if (!groups.has(ext)) groups.set(ext, []); groups.get(ext)!.push(d); });
      return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
        .map(([ext, docs]) => ({ key: ext, label: ext.toUpperCase(), courseColor: undefined, docs: docs.sort((a, b) => a.title.localeCompare(b.title, 'da')) }));
    }
    return [];
  }, [filtered, courses, courseMap, sort]);

  return (
    <div className="space-y-5 max-w-[780px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[32px] leading-tight" style={{ color: 'var(--text-primary)' }}>Dokumenter</h1>
          <p className="font-mono text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {hasFilters ? `${filtered.length} af ${documents.length} filer` : `${documents.length} filer`}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Tilføj dokument
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {/* Sort tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                sort === opt.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filter dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              hasFilters
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtrér
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {filterOpen && (
            <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-100 rounded-xl shadow-lg p-4 w-64 space-y-4">
              {availableCourses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fag</p>
                  <div className="space-y-1">
                    {availableCourses.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={filterCourses.has(c.id)}
                          onChange={() => toggleCourse(c.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {availableTypes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filtype</p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleType(type)}
                        className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors ${
                          filterTypes.has(type)
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Ryd alle filtre
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">Ingen dokumenter endnu</p>
          <p className="text-sm mt-1">Synkroniser fra Canvas for at hente alle kursusfiler automatisk.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm font-medium">Ingen filer matcher dine filtre</p>
          <button onClick={clearFilters} className="text-xs text-blue-500 hover:text-blue-600 mt-1">
            Ryd filtre
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map(({ key, label, docs, courseColor }, i) => (
            <DocSection
              key={key}
              label={label}
              count={docs.length}
              docs={docs}
              getSubtitle={sort !== 'fag' ? (doc) => courseMap.get(doc.courseId)?.name : undefined}
              onDelete={deleteDocument}
              fileError={sort === 'fag' ? fileErrors.get(key) : undefined}
              courseColor={sort === 'fag' ? courseColor : undefined}
            />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Tilføj dokument">
        <AddDocumentForm onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
