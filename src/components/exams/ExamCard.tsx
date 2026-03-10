'use client';

import { useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';
import { CalendarDays, Check, Plus, Trash2, X } from 'lucide-react';
import type { Exam } from '@/types';
import { getCourseHex } from '@/lib/courseColors';

const generateId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

interface ExamCardProps {
  exam: Exam;
}

export function ExamCard({ exam }: ExamCardProps) {
  const { deleteExam, updateExam, getCourseById, courses } = useApp();
  const course = getCourseById(exam.courseId);
  const hex = getCourseHex(course?.color, exam.courseId);
  const examDate = new Date(exam.date);
  const isPast = examDate < new Date();
  const daysUntil = Math.ceil(
    (examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const topics = exam.topics ?? [];
  const doneCount = topics.filter((t) => t.done).length;
  const total = topics.length;

  const [newTopic, setNewTopic] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function toggleTopic(id: string) {
    updateExam(exam.id, {
      topics: topics.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    });
  }

  function addTopic() {
    const text = newTopic.trim();
    if (!text) return;
    updateExam(exam.id, {
      topics: [...topics, { id: generateId(), text, done: false }],
    });
    setNewTopic('');
    inputRef.current?.focus();
  }

  function deleteTopic(id: string) {
    updateExam(exam.id, { topics: topics.filter((t) => t.id !== id) });
  }

  return (
    <div
      className="bg-white flex items-start gap-4 p-5"
      style={{
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${isPast ? 'var(--border)' : hex}`,
        borderRadius: 'var(--radius-md)',
      }}
    >
      <CalendarDays className="w-5 h-5 shrink-0 mt-0.5" style={{ color: isPast ? 'var(--text-muted)' : hex }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-[15px]" style={{ color: course ? 'var(--text-primary)' : 'var(--accent-primary)' }}>
              {course?.name ?? exam.courseName ?? 'Ukendt fag'}
            </p>
            {!course && (
              <select
                value=""
                onChange={(e) => updateExam(exam.id, { courseId: e.target.value, courseName: courses.find(c => c.id === e.target.value)?.name })}
                className="mt-1 text-xs px-2 py-0.5 focus:outline-none"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}
              >
                <option value="" disabled>Tilknyt nyt fag…</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            {(exam.title || course?.code) && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {[exam.title, course?.code].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="font-mono text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {examDate.toLocaleDateString('da-DK', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isPast ? (
              <span className="font-mono text-xs px-2.5 py-1 font-medium" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)' }}>
                Forbi
              </span>
            ) : (
              <span className="font-mono text-xs px-2.5 py-1 font-semibold text-white" style={{ backgroundColor: hex, borderRadius: 'var(--radius-sm)' }}>
                {daysUntil}d
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteExam(exam.id)}
              style={{ color: 'var(--text-muted)' }}
              className="p-1.5"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {exam.notes && (
          <p className="text-sm mt-3 px-3 py-2.5 leading-relaxed" style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
            {exam.notes}
          </p>
        )}

        {/* Preparation checklist */}
        <div className="mt-4 space-y-2">
          {topics.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <span className="section-label">Forberedelse</span>
                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{doneCount} af {total}</span>
              </div>
              {/* Segmented progress */}
              <div className="flex items-center gap-1">
                {topics.map((t) => (
                  <div
                    key={t.id}
                    className="h-2 flex-1 transition-colors"
                    style={{
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: t.done ? 'var(--accent-primary)' : 'var(--border)',
                    }}
                  />
                ))}
              </div>
              <ul className="space-y-1 mt-2">
                {topics.map((topic) => (
                  <li key={topic.id} className="flex items-center gap-2 group">
                    <input
                      type="checkbox"
                      className="check-custom"
                      checked={topic.done}
                      onChange={() => toggleTopic(topic.id)}
                    />
                    <span
                      className="text-sm flex-1"
                      style={{ color: topic.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: topic.done ? 'line-through' : 'none' }}
                    >
                      {topic.text}
                    </span>
                    <button
                      onClick={() => deleteTopic(topic.id)}
                      className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="flex items-center gap-2 mt-2">
            <input
              ref={inputRef}
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }}
              placeholder={topics.length === 0 ? 'Tilføj forberedelsesemne…' : 'Tilføj emne…'}
              className="flex-1 text-xs px-2.5 py-1.5 focus:outline-none bg-white"
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={addTopic}
              disabled={!newTopic.trim()}
              className="p-1.5 rounded transition-colors duration-fast disabled:opacity-30"
              style={{ color: 'var(--accent-primary)' }}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
