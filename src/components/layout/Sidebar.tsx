'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sun,
  CheckSquare,
  BookOpen,
  GraduationCap,
  CalendarDays,
  FolderOpen,
  Settings,
  LogOut,
  Copy,
  Check,
  Bell,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { useState, useEffect } from 'react';
import { unseenCount, ACTIVITY_FEED_KEY } from '@/lib/activityFeed';

const NAV_ITEMS = [
  { label: 'Oversigt',      href: '/',             icon: LayoutDashboard },
  { label: 'I dag',         href: '/today',        icon: Sun },
  { label: 'Studiegruppe',  href: '/studiegruppe', icon: Users },
  { label: 'Aktivitet',     href: '/activity',     icon: Bell },
  { label: 'Kalender',      href: '/calendar',     icon: CalendarDays },
  { label: 'Fag',           href: '/fag',          icon: GraduationCap },
  { label: 'Dokumenter',    href: '/documents',    icon: FolderOpen },
  { label: 'Opgaver',       href: '/tasks',        icon: CheckSquare },
  { label: 'Eksamener',     href: '/exams',        icon: BookOpen },
];

const MOBILE_ITEMS = NAV_ITEMS.slice(0, 4);

export function Sidebar() {
  const pathname = usePathname();
  const { groupConfig, currentGroup, currentUser, logout } = useApp();
  const [copied, setCopied] = useState(false);
  const [activityUnseen, setActivityUnseen] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setActivityUnseen(unseenCount());
    function onStorage(e: StorageEvent) {
      if (e.key === ACTIVITY_FEED_KEY) setActivityUnseen(unseenCount());
    }
    function onSeen() { setActivityUnseen(0); }
    window.addEventListener('storage', onStorage);
    window.addEventListener('sg:activity-seen', onSeen);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('sg:activity-seen', onSeen);
    };
  }, []);

  const initial = (currentUser?.name ?? 'U')[0].toUpperCase();

  function copyInviteCode() {
    if (!currentGroup?.inviteCode) return;
    navigator.clipboard.writeText(currentGroup.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  const groupName = groupConfig?.name ?? 'Studiegruppe';

  return (
    <>
      {/* ── Desktop sidebar — compact 40px, expands on hover ──── */}
      <aside
        className="hidden md:flex flex-col shrink-0 bg-white border-r transition-all duration-200 ease-in-out overflow-hidden"
        style={{
          width: hovered ? 200 : 40,
          borderColor: 'var(--border)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Group name — serif small caps */}
        <div
          className="h-11 flex items-center border-b px-2.5 shrink-0 overflow-hidden"
          style={{ borderColor: 'var(--border)' }}
        >
          {hovered ? (
            <span
              className="font-serif text-sm tracking-wide whitespace-nowrap"
              style={{ color: 'var(--text-primary)' }}
            >
              {groupName}
            </span>
          ) : (
            <span
              className="font-serif text-sm w-full text-center"
              style={{ color: 'var(--text-primary)' }}
            >
              {groupName[0]}
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 px-1 space-y-0.5">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            const badge = href === '/activity' && activityUnseen > 0 ? activityUnseen : 0;
            return (
              <Link
                key={href}
                href={href}
                title={hovered ? undefined : label}
                className="relative flex items-center gap-2.5 py-1.5 rounded transition-colors duration-fast"
                style={{
                  paddingLeft: hovered ? 10 : 8,
                  paddingRight: hovered ? 10 : 8,
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: active && hovered ? '#F0EDE7' : undefined,
                }}
              >
                {/* Terracotta active dot */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  />
                )}
                <Icon
                  className="w-[16px] h-[16px] shrink-0"
                  style={{
                    color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                  }}
                />
                {hovered && (
                  <span className="text-[13px] font-medium whitespace-nowrap flex-1">
                    {label}
                  </span>
                )}
                {hovered && badge > 0 && (
                  <span
                    className="min-w-[16px] h-4 flex items-center justify-center rounded text-[10px] font-semibold px-1 text-white"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
                {!hovered && badge > 0 && (
                  <span
                    className="absolute top-1 right-1 w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: settings + user */}
        <div className="px-1 py-2 border-t space-y-0.5" style={{ borderColor: 'var(--border)' }}>
          <Link
            href="/settings"
            title={hovered ? undefined : 'Indstillinger'}
            className="flex items-center gap-2.5 py-1.5 rounded transition-colors duration-fast"
            style={{
              paddingLeft: hovered ? 10 : 8,
              paddingRight: hovered ? 10 : 8,
              color: pathname.startsWith('/settings') ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            <Settings
              className="w-[16px] h-[16px] shrink-0"
              style={{
                color: pathname.startsWith('/settings') ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            />
            {hovered && <span className="text-[13px] font-medium whitespace-nowrap">Indstillinger</span>}
          </Link>

          {/* User */}
          <div
            className="flex items-center gap-2.5 py-1.5"
            style={{ paddingLeft: hovered ? 10 : 8, paddingRight: hovered ? 10 : 8 }}
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#E8DDD5', color: 'var(--text-secondary)' }}
            >
              <span className="text-[10px] font-bold">{initial}</span>
            </div>
            {hovered && (
              <>
                <span className="text-xs font-medium truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                  {currentUser?.name ?? 'Bruger'}
                </span>
                <button
                  onClick={logout}
                  title="Log ud"
                  className="p-1 rounded transition-colors duration-fast"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Invite code */}
          {hovered && currentGroup?.inviteCode && (
            <button
              onClick={copyInviteCode}
              title="Kopiér invitationskode"
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors duration-fast"
              style={{ color: 'var(--text-muted)' }}
            >
              {copied ? (
                <Check className="w-3 h-3 shrink-0" style={{ color: 'var(--accent-secondary)' }} />
              ) : (
                <Copy className="w-3 h-3 shrink-0" />
              )}
              <span className="font-mono tracking-widest text-[11px]">
                {copied ? 'Kopieret!' : currentGroup.inviteCode}
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ───────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white flex"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {MOBILE_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
              style={{ color: active ? 'var(--accent-primary)' : 'var(--text-muted)' }}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
