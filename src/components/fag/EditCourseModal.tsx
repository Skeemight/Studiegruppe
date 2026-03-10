'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Modal } from '@/components/ui/Modal';
import { ColorPicker } from '@/components/ui/ColorPicker';
import type { Course } from '@/types';
import type { CourseColor } from '@/lib/courseColors';

interface EditCourseModalProps {
  course: Course;
  onClose: () => void;
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent bg-white';

export function EditCourseModal({ course, onClose }: EditCourseModalProps) {
  const { updateCourse } = useApp();
  const [name, setName] = useState(course.name);
  const [color, setColor] = useState<string>(course.color ?? 'blue');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    updateCourse(course.id, { name: name.trim(), color: color as CourseColor });
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Rediger fag">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fagnavn</label>
          <input
            className={inputClass}
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">Farve</label>
          <ColorPicker value={color} onChange={c => setColor(c)} />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit"
            className="flex-1 bg-gray-900 text-white text-sm font-medium py-2 rounded-xl hover:bg-gray-800 transition-colors">
            Gem
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2 rounded-xl hover:bg-gray-200 transition-colors">
            Annuller
          </button>
        </div>
      </form>
    </Modal>
  );
}
