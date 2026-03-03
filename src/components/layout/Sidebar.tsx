'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckSquare, FileText, BookOpen, GraduationCap } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Oversigt', href: '/', icon: LayoutDashboard },
  { label: 'Fag', href: '/fag', icon: GraduationCap },
  { label: 'Opgaver', href: '/tasks', icon: CheckSquare },
  { label: 'Dokumenter', href: '/documents', icon: FileText },
  { label: 'Eksamener', href: '/exams', icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-14 lg:w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="h-14 flex items-center justify-center lg:justify-start px-4 border-b border-gray-100 gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">SG</span>
        </div>
        <span className="text-sm font-bold text-gray-800 hidden lg:block">Studiegruppe</span>
      </div>

      <nav className="flex-1 p-2 lg:p-3 space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden lg:block">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
