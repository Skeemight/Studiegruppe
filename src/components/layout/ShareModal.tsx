'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';
import { Check, Copy, Download } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export function ShareModal({ onClose }: Props) {
  const { exportData, importData, courses, tasks, documents, exams, meetings, notes } = useApp();
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importOk, setImportOk] = useState(false);
  const [tab, setTab] = useState<'export' | 'import'>('export');

  function getPayload(): string {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      courses,
      tasks,
      documents,
      exams,
      meetings,
      notes,
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getPayload());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for environments without clipboard API
      exportData();
    }
  }

  function handleImport() {
    setImportError('');
    setImportOk(false);
    const text = importText.trim();
    if (!text) { setImportError('Indsæt venligst en datakode.'); return; }

    let json: string;
    try {
      json = decodeURIComponent(escape(atob(text)));
    } catch {
      // Maybe it's raw JSON
      json = text;
    }

    if (!window.confirm('Dette erstatter AL din nuværende data. Fortsæt?')) return;

    const result = importData(json);
    if (result.success) {
      setImportOk(true);
      setTimeout(() => { setImportOk(false); setImportText(''); onClose(); }, 1500);
    } else {
      setImportError(result.error ?? 'Ugyldig kode');
    }
  }

  const totalItems = courses.length + tasks.length + documents.length + exams.length + meetings.length + notes.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Eksportér data som en kompakt kode og send den til dine gruppemedlemmer — de importerer den med ét klik.
      </p>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {(['export', 'import'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'export' ? 'Eksportér' : 'Importér'}
          </button>
        ))}
      </div>

      {tab === 'export' && (
        <div className="space-y-3">
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700">Dine data:</p>
            <p>{courses.length} fag · {tasks.length} opgaver · {documents.length} dokumenter</p>
            <p>{exams.length} eksamener · {meetings.length} møder · {notes.length} noter</p>
            <p className="text-gray-400 mt-1">I alt {totalItems} elementer</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Kopieret!' : 'Kopiér datakode'}
            </Button>
            <Button variant="secondary" onClick={exportData} className="flex-1 flex items-center justify-center gap-2">
              <Download className="w-3.5 h-3.5" />
              JSON-fil
            </Button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Send koden til dine gruppemedlemmer — de indsætter den under &quot;Importér&quot;.
          </p>
        </div>
      )}

      {tab === 'import' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Indsæt datakode fra en gruppemedlem
            </label>
            <textarea
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportError(''); }}
              placeholder="Indsæt koden her…"
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
            />
          </div>

          {importError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{importError}</p>
          )}
          {importOk && (
            <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              Data importeret! Lukker…
            </p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={!importText.trim()} className="flex-1">
              Importér data
            </Button>
            <Button variant="secondary" onClick={onClose} className="flex-1">Annuller</Button>
          </div>
        </div>
      )}
    </div>
  );
}
