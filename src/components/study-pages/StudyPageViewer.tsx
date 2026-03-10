'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useApp } from '@/store/AppContext';
import { X, Pencil, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { StudyPageModal } from './StudyPageModal';
import type { StudyPage } from '@/types';

interface Props {
  page: StudyPage;
  courseName: string;
  onClose: () => void;
}

export function StudyPageViewer({ page, courseName, onClose }: Props) {
  const { deleteStudyPage, updateStudyPage, currentUser } = useApp();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(600);
  const [editing, setEditing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(page.title);
  const isOwn = page.createdById === currentUser?.id;

  function handleRename() {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== page.title) {
      updateStudyPage(page.id, { title: trimmed });
    }
    setRenaming(false);
  }

  const adjustHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.body) return;
    const h = iframe.contentDocument.documentElement.scrollHeight;
    if (h > 100) setIframeHeight(h + 32);
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const handleLoad = () => {
      adjustHeight();
      // Also observe resize inside the iframe for mermaid rendering
      try {
        const obs = new ResizeObserver(() => adjustHeight());
        if (iframe.contentDocument?.body) obs.observe(iframe.contentDocument.body);
        return () => obs.disconnect();
      } catch { /* cross-origin fallback */ }
    };
    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [adjustHeight, page.htmlContent]);

  function handleDelete() {
    if (!confirm('Er du sikker på du vil slette denne studieside?')) return;
    deleteStudyPage(page.id);
    onClose();
  }

  if (editing) {
    return (
      <StudyPageModal
        courseId={page.courseId}
        moduleId={page.moduleId}
        moduleName={page.moduleName}
        weekNumber={page.weekNumber}
        existingPageId={page.id}
        existingTitle={page.title}
        existingHtml={page.htmlContent}
        onClose={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  const containerCls = fullscreen
    ? 'fixed inset-0 z-50 bg-white flex flex-col w-screen h-screen'
    : 'fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/20 backdrop-blur-sm';

  const innerCls = fullscreen
    ? 'flex flex-col w-full h-full'
    : 'bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-5xl max-h-[92vh] flex flex-col';

  return (
    <div className={containerCls} onClick={fullscreen ? undefined : onClose}>
      <div className={innerCls} onClick={e => e.stopPropagation()}>
        {/* Header bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0">
            {renaming ? (
              <input
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={handleRename}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
                className="text-sm font-bold text-gray-900 w-full px-1.5 py-0.5 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p
                className={`text-sm font-bold text-gray-900 truncate ${isOwn ? 'cursor-pointer hover:text-blue-600' : ''}`}
                onClick={isOwn ? () => { setRenameValue(page.title); setRenaming(true); } : undefined}
                title={isOwn ? 'Klik for at omdøbe' : undefined}
              >
                {page.title}
              </p>
            )}
            <p className="text-xs text-gray-400 truncate">
              {courseName}
              {page.createdByName && <> · Oprettet af {page.createdByName}</>}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setFullscreen(f => !f)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title={fullscreen ? 'Afslut fuldskærm' : 'Fuldskærm'}
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            {isOwn && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Rediger"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Slet"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-1"
              title="Luk"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Iframe render */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <iframe
            ref={iframeRef}
            srcDoc={page.htmlContent}
            sandbox="allow-scripts allow-same-origin"
            title={page.title}
            style={{ width: '100%', height: fullscreen ? '100%' : iframeHeight, border: 'none', display: 'block' }}
            className="bg-white"
          />
        </div>
      </div>
    </div>
  );
}
