'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/store/AppContext';
import { Upload, Code, X } from 'lucide-react';

interface Props {
  courseId: string;
  moduleId: string;
  moduleName: string;
  weekNumber?: number;
  existingPageId?: string;
  existingTitle?: string;
  existingHtml?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function StudyPageModal({
  courseId, moduleId, moduleName, weekNumber,
  existingPageId, existingTitle, existingHtml,
  onClose, onSaved,
}: Props) {
  const { addStudyPage, updateStudyPage, currentUser } = useApp();
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [title, setTitle] = useState(existingTitle ?? moduleName);
  const [html, setHtml] = useState(existingHtml ?? '');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = !!existingPageId;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setHtml(reader.result as string);
      if (!title || title === moduleName) {
        setTitle(file.name.replace(/\.html?$/i, ''));
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }

  function handleSave() {
    if (!html.trim() || !title.trim()) return;
    if (isEdit) {
      updateStudyPage(existingPageId!, { title: title.trim(), htmlContent: html });
    } else {
      addStudyPage({
        courseId,
        moduleId,
        moduleName,
        weekNumber,
        title: title.trim(),
        htmlContent: html,
        createdById: currentUser?.id ?? '',
        createdByName: currentUser?.name ?? '',
      });
    }
    onSaved?.();
    onClose();
  }

  const htmlSize = new Blob([html]).size;
  const sizeLabel = htmlSize > 1024 ? `${(htmlSize / 1024).toFixed(0)} KB` : `${htmlSize} B`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">
            {isEdit ? 'Rediger studieside' : 'Tilføj studieside'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Titel</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="f.eks. Uge 10 — Database 2"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Mode toggle */}
          {!isEdit && (
            <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('paste')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                  mode === 'paste' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                Indsæt HTML
              </button>
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                  mode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload fil
              </button>
            </div>
          )}

          {/* Paste mode */}
          {(mode === 'paste' || isEdit) && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">HTML-indhold</label>
              <textarea
                value={html}
                onChange={e => setHtml(e.target.value)}
                placeholder="Indsæt HTML her…"
                rows={10}
                className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50"
              />
            </div>
          )}

          {/* Upload mode */}
          {mode === 'upload' && !isEdit && (
            <div>
              {!html ? (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-colors"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-sm font-medium">Klik for at vælge .html-fil</span>
                </button>
              ) : (
                <div className="bg-green-50 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-green-600 text-sm font-medium flex-1">{fileName}</span>
                  <span className="text-xs text-green-500">{sizeLabel}</span>
                  <button onClick={() => { setHtml(''); setFileName(''); }} className="text-green-400 hover:text-green-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {html && (
            <p className="text-xs text-gray-400">Størrelse: {sizeLabel}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Annuller
          </button>
          <button
            onClick={handleSave}
            disabled={!html.trim() || !title.trim()}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            {isEdit ? 'Gem ændringer' : 'Gem studieside'}
          </button>
        </div>

        <input ref={fileRef} type="file" accept=".html,.htm" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}
