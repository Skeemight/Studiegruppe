import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  style,
  children,
  ...props
}: ButtonProps) {
  const sizeClass = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  const variantStyle: React.CSSProperties = {
    primary:   { backgroundColor: 'var(--accent-primary)', color: '#fff' },
    secondary: { backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
    ghost:     { backgroundColor: 'transparent', color: 'var(--text-secondary)' },
    danger:    { backgroundColor: '#FEE', color: 'var(--accent-error)' },
  }[variant];

  return (
    <button
      className={`inline-flex items-center font-medium transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 ${sizeClass} ${className}`}
      style={{
        borderRadius: 'var(--radius-sm)',
        ...variantStyle,
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
