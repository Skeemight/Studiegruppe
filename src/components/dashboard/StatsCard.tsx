import { type ReactNode } from 'react';
import Link from 'next/link';

const COLOR_MAP = {
  green: 'var(--accent-secondary)',
  blue: 'var(--accent-primary)',
  purple: '#7C5CBF',
  orange: '#C4803E',
};

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  color: keyof typeof COLOR_MAP;
  href: string;
}

export function StatsCard({ label, value, icon, color, href }: StatsCardProps) {
  return (
    <Link href={href}>
      <div
        className="bg-white px-4 py-3.5 hover-lift cursor-pointer"
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="section-label">{label}</p>
            <p className="font-mono text-xl font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
              {value}
            </p>
          </div>
          <div style={{ color: COLOR_MAP[color] }}>{icon}</div>
        </div>
      </div>
    </Link>
  );
}
