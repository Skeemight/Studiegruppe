'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import {
  CANVAS_URL_KEY,
  CANVAS_TOKEN_KEY,
  CANVAS_SELECTED_KEY,
  CANVAS_LAST_SYNC_KEY,
  runCanvasSync,
  getMergeRules,
} from '@/lib/canvasApi';

const SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'lige nu';
  if (diffMin < 60) return `${diffMin}m siden`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}t siden`;
  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

export function useAutoCanvasSync() {
  const { upsertCourses, upsertTasks, upsertDocuments, upsertModules, pruneCanvasData, mergeCourses } = useApp();
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const didRun = useRef(false);

  const callbacks = { upsertCourses, upsertTasks, upsertDocuments, upsertModules, pruneCanvasData };

  const sync = useCallback(async () => {
    const url = localStorage.getItem(CANVAS_URL_KEY) ?? '';
    const token = localStorage.getItem(CANVAS_TOKEN_KEY) ?? '';
    const savedIds = localStorage.getItem(CANVAS_SELECTED_KEY);
    if (!url || !token || !savedIds) return;

    let selectedIds: Set<number>;
    try {
      selectedIds = new Set(JSON.parse(savedIds) as number[]);
    } catch { return; }
    if (selectedIds.size === 0) return;

    setSyncing(true);
    try {
      await runCanvasSync(url, token, selectedIds, callbacks);

      // Apply saved merge rules automatically
      for (const rule of getMergeRules()) {
        mergeCourses(rule.keepId, rule.removeId, rule.name);
      }

      const now = new Date();
      localStorage.setItem(CANVAS_LAST_SYNC_KEY, now.toISOString());
      setLastSyncedAt(now);
    } catch {
      // Silent failure — user will see outdated data but nothing breaks
    } finally {
      setSyncing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upsertCourses, upsertTasks, upsertDocuments, upsertModules, pruneCanvasData, mergeCourses]);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const lastSyncStr = localStorage.getItem(CANVAS_LAST_SYNC_KEY);
    if (lastSyncStr) {
      const lastSync = new Date(lastSyncStr);
      setLastSyncedAt(lastSync);
      if (Date.now() - lastSync.getTime() < SYNC_INTERVAL_MS) return;
    }

    // Only auto-sync if credentials are saved
    if (localStorage.getItem(CANVAS_URL_KEY) && localStorage.getItem(CANVAS_TOKEN_KEY)) {
      sync();
    }
  }, [sync]);

  return { lastSyncedAt, syncing, sync };
}
