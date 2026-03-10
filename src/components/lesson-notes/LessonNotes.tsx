'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { MarkdownContent } from '@/lib/markdownLite';
import { PenLine, Trash2, Check, X, Plus } from 'lucide-react';
import type { LessonNote } from '@/types';

// ── Relative time ──────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return 'lige nu';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}t`;
  return new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

// ── Inline editor ──────────────────────────────────────────────────────────────

function NoteEditor({
  initial,
  placeholder,
  onSave,
  onCancel,
}: {
  initial?: string;
  placeholder: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial ?? '');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onCancel(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (text.trim()) onSave(text.trim());
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={4}
        className="w-full px-3 py-2 text-sm text-gray-800 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-300 focus:bg-white resize-none placeholder:text-gray-300 transition-colors leading-relaxed"
      />
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-300">**fed** *kursiv* · - liste · ⌘↵ for at gemme</p>
        <div className="flex gap-1.5">
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-3 h-3" /> Annuller
          </button>
          <button
            onClick={() => { if (text.trim()) onSave(text.trim()); }}
            disabled={!text.trim()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <Check className="w-3 h-3" /> Gem
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single note card ───────────────────────────────────────────────────────────

function NoteItem({ note, isOwn }: { note: LessonNote; isOwn: boolean }) {
  const { updateLessonNote, deleteLessonNote } = useApp();
  const [editing, setEditing] = useState(false);

  const initials = note.authorName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  if (editing) {
    return (
      <div className="pt-2 pb-3">
        <NoteEditor
          initial={note.content}
          placeholder="Skriv note…"
          onSave={(content) => { updateLessonNote(note.id, content); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 py-2.5 group">
      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[9px] font-bold text-gray-600">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-xs font-semibold text-gray-700">{note.authorName}</span>
          <span className="text-[11px] text-gray-300">{relTime(note.updatedAt)}</span>
          {note.updatedAt !== note.createdAt && (
            <span className="text-[10px] text-gray-300 italic">redigeret</span>
          )}
        </div>
        <MarkdownContent content={note.content} />
      </div>
      {isOwn && (
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Rediger"
          >
            <PenLine className="w-3 h-3" />
          </button>
          <button
            onClick={() => deleteLessonNote(note.id)}
            className="p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
            title="Slet"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Public component ───────────────────────────────────────────────────────────

interface Props {
  courseId: string;
  moduleId: string;
  lessonTitle: string;
  /** If true, shows notes collapsed with a count; expand on click */
  compact?: boolean;
}

export function LessonNotes({ courseId, moduleId, lessonTitle, compact = false }: Props) {
  const { lessonNotes, addLessonNote, currentUser } = useApp();
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  const notes = lessonNotes
    .filter((n) => n.moduleId === moduleId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  function handleAdd(content: string) {
    if (!currentUser) return;
    addLessonNote({
      courseId,
      moduleId,
      lessonTitle,
      content,
      authorId: currentUser.id,
      authorName: currentUser.name,
    });
    setAdding(false);
  }

  // Compact mode: just show "X noter · Tilføj"
  if (compact && !expanded) {
    return (
      <div className="flex items-center gap-2 pt-1">
        {notes.length > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {notes.length} {notes.length === 1 ? 'note' : 'noter'}
          </button>
        )}
        <button
          onClick={() => { setExpanded(true); setAdding(true); }}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Tilføj note
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Existing notes */}
      {notes.length > 0 && (
        <div className="divide-y divide-gray-50 pt-1">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isOwn={note.authorId === currentUser?.id}
            />
          ))}
        </div>
      )}

      {/* Inline editor */}
      {adding ? (
        <div className="pt-2">
          <NoteEditor
            placeholder="Hvad lærte du i dag? **fed**, *kursiv*, - liste…"
            onSave={handleAdd}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 pt-2 text-xs text-gray-400 hover:text-blue-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Tilføj note
        </button>
      )}
    </div>
  );
}
