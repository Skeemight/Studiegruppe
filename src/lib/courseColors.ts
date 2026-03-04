export const COURSE_COLORS = ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan', 'orange', 'pink'] as const;
export type CourseColor = typeof COURSE_COLORS[number];

export const COLOR_MAP: Record<CourseColor, {
  bg: string; text: string; border: string; dot: string; light: string; ring: string;
}> = {
  blue:    { bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-l-blue-400',    dot: 'bg-blue-500',    light: 'bg-blue-50',    ring: 'ring-blue-400' },
  violet:  { bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-l-violet-400',  dot: 'bg-violet-500',  light: 'bg-violet-50',  ring: 'ring-violet-400' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-l-emerald-400', dot: 'bg-emerald-500', light: 'bg-emerald-50', ring: 'ring-emerald-400' },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-l-amber-400',   dot: 'bg-amber-500',   light: 'bg-amber-50',   ring: 'ring-amber-400' },
  rose:    { bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-l-rose-400',    dot: 'bg-rose-500',    light: 'bg-rose-50',    ring: 'ring-rose-400' },
  cyan:    { bg: 'bg-cyan-100',    text: 'text-cyan-700',    border: 'border-l-cyan-400',    dot: 'bg-cyan-500',    light: 'bg-cyan-50',    ring: 'ring-cyan-400' },
  orange:  { bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-l-orange-400',  dot: 'bg-orange-500',  light: 'bg-orange-50',  ring: 'ring-orange-400' },
  pink:    { bg: 'bg-pink-100',    text: 'text-pink-700',    border: 'border-l-pink-400',    dot: 'bg-pink-500',    light: 'bg-pink-50',    ring: 'ring-pink-400' },
};

export const DOT_COLORS: Record<CourseColor, string> = {
  blue: '#3b82f6', violet: '#8b5cf6', emerald: '#10b981',
  amber: '#f59e0b', rose: '#f43f5e', cyan: '#06b6d4',
  orange: '#f97316', pink: '#ec4899',
};

export function getCourseColor(color?: string, courseId?: string) {
  if (color && COLOR_MAP[color as CourseColor]) return COLOR_MAP[color as CourseColor];
  if (courseId) {
    // Derive a stable color from the ID so existing courses always look consistent
    const hash = [...courseId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return COLOR_MAP[COURSE_COLORS[hash % COURSE_COLORS.length]];
  }
  return COLOR_MAP.blue;
}
