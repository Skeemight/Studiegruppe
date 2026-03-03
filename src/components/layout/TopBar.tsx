import { GROUP_PROFILE } from '@/config/group';

export function TopBar() {
  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 shrink-0">
      <div className="flex items-center justify-between w-full gap-3">
        <h1 className="text-sm font-semibold text-gray-700 tracking-wide">Studiegruppe Hub</h1>
        <p className="text-xs text-gray-500 hidden sm:block">
          {GROUP_PROFILE.program} · {GROUP_PROFILE.members.length} medlemmer
        </p>
      </div>
    </header>
  );
}
