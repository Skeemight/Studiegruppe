import { type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

const COLOR_MAP = {
  green: 'bg-green-50 text-green-600',
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
};

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  color: keyof typeof COLOR_MAP;
}

export function StatsCard({ label, value, icon, color }: StatsCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${COLOR_MAP[color]}`}>{icon}</div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        </div>
      </div>
    </Card>
  );
}
