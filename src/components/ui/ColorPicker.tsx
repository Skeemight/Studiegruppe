'use client';

import { Check } from 'lucide-react';
import { COURSE_COLORS, DOT_COLORS, type CourseColor } from '@/lib/courseColors';

interface ColorPickerProps {
  value: string;
  onChange: (color: CourseColor) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {COURSE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          title={color}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            value === color ? 'scale-110 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110 opacity-80 hover:opacity-100'
          }`}
          style={{ backgroundColor: DOT_COLORS[color] }}
        >
          {value === color && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
