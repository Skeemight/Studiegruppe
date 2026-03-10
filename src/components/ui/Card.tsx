import { type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className = '', style, ...props }: CardProps) {
  return (
    <div
      className={`bg-white ${className}`}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
