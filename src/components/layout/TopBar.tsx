'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Upload, RefreshCw, Search, CalendarDays } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { Modal } from '@/components/ui/Modal';
import { CanvasSyncModal } from '@/components/layout/CanvasSyncModal';
import { SearchModal } from '@/components/layout/SearchModal';
import { ShareModal } from '@/components/layout/ShareModal';
import { IcsImportModal } from '@/components/layout/IcsImportModal';
import { useAutoCanvasSync, formatRelativeTime } from '@/hooks/useAutoCanvasSync';

export function TopBar() {
  const { exportData, importData, groupConfig } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showCanvas, setShowCanvas] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showIcs, setShowIcs] = useState(false);

  const { lastSyncedAt, syncing } = useAutoCanvasSync();

  // Relative time refreshes every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Global Cmd+K / Ctrl+K shortcut
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

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const json = reader.result as string;
      if (!window.confirm('Dette erstatter AL din nuværende data med indholdet fra filen. Fortsæt?')) {
        e.target.value = '';
        return;
      }
      const result = importData(json);
      if (result.success) {
        setImportStatus('ok');
        setTimeout(() => setImportStatus('idle'), 3000);
      } else {
        setErrorMsg(result.error ?? 'Ukendt fejl');
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 4000);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  return (
    <>
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 shrink-0">
      <div className="flex items-center justify-between w-full gap-3">
        <h1 className="text-sm font-semibold text-gray-700 tracking-wide">Studiegruppe Hub</h1>
        <div className="flex items-center gap-2">
          {importStatus === 'ok' && (
            <span className="text-xs text-green-600 font-medium">Data importeret</span>
          )}
          {importStatus === 'error' && (
            <span className="text-xs text-red-600 font-medium">{errorMsg}</span>
          )}
          <p className="text-xs text-gray-500 hidden sm:block mr-2">
            {groupConfig?.program} · {groupConfig?.members.length} medlemmer
          </p>
          {/* Search */}
          <button
            onClick={() => setShowSearch(true)}
            title="Søg (Cmd+K)"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-gray-400">Søg…</span>
            <kbd className="hidden lg:inline text-[10px] text-gray-300 border border-gray-100 rounded px-1 py-0.5 font-mono ml-1">⌘K</kbd>
          </button>
          {/* ICS skema */}
          <button
            onClick={() => setShowIcs(true)}
            title="Importer skema fra .ics-fil"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Skema</span>
          </button>
          {/* Canvas sync */}
          <button
            onClick={() => setShowCanvas(true)}
            title="Synkroniser fra Canvas"
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
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
          {/* Share */}
          <button
            onClick={() => setShowShare(true)}
            title="Del eller importer data"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Del</span>
          </button>
          {/* File import (hidden) */}
          <button
            onClick={handleImportClick}
            title="Importer data fra JSON-fil"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importer</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </header>

    <Modal open={showIcs} onClose={() => setShowIcs(false)} title="Importer skema (.ics)">
      <IcsImportModal onClose={() => setShowIcs(false)} />
    </Modal>

    <Modal open={showCanvas} onClose={() => setShowCanvas(false)} title="Canvas sync">
      <CanvasSyncModal onClose={() => setShowCanvas(false)} />
    </Modal>

    <SearchModal open={showSearch} onClose={() => setShowSearch(false)} />

    <Modal open={showShare} onClose={() => setShowShare(false)} title="Del data">
      <ShareModal onClose={() => setShowShare(false)} />
    </Modal>
    </>
  );
}
