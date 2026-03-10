'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Search, CalendarDays } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CanvasSyncModal } from '@/components/layout/CanvasSyncModal';
import { SearchModal } from '@/components/layout/SearchModal';
import { IcsImportModal } from '@/components/layout/IcsImportModal';
import { useAutoCanvasSync, formatRelativeTime } from '@/hooks/useAutoCanvasSync';

export function TopBar() {
  const [showCanvas, setShowCanvas] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showIcs, setShowIcs] = useState(false);

  const { lastSyncedAt, syncing } = useAutoCanvasSync();

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    function handleOpenSync() { setShowCanvas(true); }
    window.addEventListener('sg:open-canvas-sync', handleOpenSync);
    return () => window.removeEventListener('sg:open-canvas-sync', handleOpenSync);
  }, []);

  return (
    <>
      <header
        className="h-11 bg-white flex items-center px-4 shrink-0 gap-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={() => setShowSearch(true)}
          title="Søg (Cmd+K)"
          className="flex items-center gap-2 flex-1 max-w-xs px-2.5 py-1 text-xs transition-colors duration-fast"
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
          }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Søg…</span>
          <kbd className="hidden lg:inline ml-auto text-[10px] font-mono px-1 py-0.5" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
            ⌘K
          </kbd>
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setShowIcs(true)}
          title="Importer skema fra .ics-fil"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors duration-fast hover:opacity-80"
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
          }}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Skema</span>
        </button>

        <button
          onClick={() => setShowCanvas(true)}
          title="Synkroniser fra Canvas"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors duration-fast"
          style={{
            border: syncing || !lastSyncedAt ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: syncing || !lastSyncedAt ? 'var(--accent-primary)' : 'var(--text-secondary)',
            backgroundColor: syncing ? 'var(--accent-primary)08' : undefined,
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">
            {syncing
              ? 'Synkroniserer…'
              : lastSyncedAt
              ? `Synket ${formatRelativeTime(lastSyncedAt)}`
              : 'Canvas sync'}
          </span>
        </button>
      </header>

      <Modal open={showIcs} onClose={() => setShowIcs(false)} title="Importer skema (.ics)">
        <IcsImportModal onClose={() => setShowIcs(false)} />
      </Modal>

      <Modal open={showCanvas} onClose={() => setShowCanvas(false)} title="Canvas sync">
        <CanvasSyncModal onClose={() => setShowCanvas(false)} />
      </Modal>

      <SearchModal open={showSearch} onClose={() => setShowSearch(false)} />
    </>
  );
}
