type BadgeVariant = 'todo' | 'in_progress' | 'done' | 'default';

const STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  todo:        { bg: 'var(--border)', text: 'var(--text-secondary)' },
  in_progress: { bg: 'var(--accent-primary)', text: '#fff' },
  done:        { bg: 'var(--accent-secondary)', text: '#fff' },
  default:     { bg: 'var(--border)', text: 'var(--text-secondary)' },
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
  const s = STYLES[variant];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: s.bg,
        color: s.text,
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {children ?? LABELS[variant] ?? variant}
    </span>
  );
}
