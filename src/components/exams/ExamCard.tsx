'use client';

import { useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CalendarDays, Check, Plus, Trash2, X } from 'lucide-react';
import type { Exam } from '@/types';
import { getCourseColor } from '@/lib/courseColors';

const generateId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

interface ExamCardProps {
  exam: Exam;
}

export function ExamCard({ exam }: ExamCardProps) {
  const { deleteExam, updateExam, getCourseById, courses } = useApp();
  const course = getCourseById(exam.courseId);
  const colors = getCourseColor(course?.color, exam.courseId);
  const examDate = new Date(exam.date);
  const isPast = examDate < new Date();
  const daysUntil = Math.ceil(
    (examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const topics = exam.topics ?? [];
  const doneCount = topics.filter((t) => t.done).length;
  const progress = topics.length > 0 ? Math.round((doneCount / topics.length) * 100) : 0;

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
    <Card className={`p-5 flex items-start gap-4 border-l-4 ${isPast ? 'border-l-gray-200' : colors.border}`}>
      <div className={`p-2.5 rounded-xl shrink-0 ${isPast ? 'bg-gray-100' : colors.light}`}>
        <CalendarDays className={`w-5 h-5 ${isPast ? 'text-gray-400' : colors.text}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`font-semibold ${course ? 'text-gray-900' : 'text-amber-600'}`}>
              {course?.name ?? exam.courseName ?? 'Ukendt fag'}
            </p>
            {!course && (
              <select
                value=""
                onChange={(e) => updateExam(exam.id, { courseId: e.target.value, courseName: courses.find(c => c.id === e.target.value)?.name })}
                className="mt-1 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                <option value="" disabled>Tilknyt nyt fag…</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            {(exam.title || course?.code) && (
              <p className="text-sm text-gray-600 mt-0.5">
                {[exam.title, course?.code].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-0.5">
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
              <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                Forbi
              </span>
            ) : (
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${colors.bg} ${colors.text}`}>
                {daysUntil}d
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteExam(exam.id)}
              className="text-red-400 hover:bg-red-50 p-1.5"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {exam.notes && (
          <p className="text-sm text-gray-500 mt-3 bg-gray-50 rounded-lg px-3 py-2.5 leading-relaxed">
            {exam.notes}
          </p>
        )}

        {/* Preparation checklist */}
        <div className="mt-4 space-y-2">
          {topics.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="font-medium">Forberedelse</span>
                <span>{doneCount}/{topics.length} emner</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${progress === 100 ? 'bg-green-500' : colors.dot}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <ul className="space-y-1 mt-2">
                {topics.map((topic) => (
                  <li key={topic.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => toggleTopic(topic.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        topic.done
                          ? `${colors.bg} border-transparent`
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {topic.done && <Check className={`w-2.5 h-2.5 ${colors.text}`} />}
                    </button>
                    <span className={`text-sm flex-1 ${topic.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {topic.text}
                    </span>
                    <button
                      onClick={() => deleteTopic(topic.id)}
                      className="p-0.5 rounded text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white placeholder:text-gray-300"
            />
            <button
              onClick={addTopic}
              disabled={!newTopic.trim()}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
