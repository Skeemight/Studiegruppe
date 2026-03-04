type BadgeVariant = 'todo' | 'in_progress' | 'done' | 'default';

const STYLES: Record<BadgeVariant, string> = {
  todo: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-50 text-blue-700',
  done: 'bg-green-50 text-green-700',
  default: 'bg-gray-100 text-gray-600',
};

const LABELS: Partial<Record<BadgeVariant, string>> = {
  todo: 'Aktiv',
  in_progress: 'I gang',
  done: 'Færdig',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children?: React.ReactNode;
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STYLES[variant]}`}>
      {children ?? LABELS[variant] ?? variant}
    </span>
  );
}
