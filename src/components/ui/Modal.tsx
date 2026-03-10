'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'md' | 'xl';
  children: React.ReactNode;
}

const SIZE_CLASS = {
  md: 'max-w-md',
  xl: 'max-w-5xl',
};

export function Modal({ open, onClose, title, size = 'md', children }: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative bg-white w-full ${SIZE_CLASS[size]}`}
        style={{
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors duration-fast hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
