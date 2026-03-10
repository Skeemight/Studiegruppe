'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, FileText, Layers, CheckCircle2, ExternalLink } from 'lucide-react';
import { readFeed, markAllSeen, unseenCount, ACTIVITY_FEED_KEY } from '@/lib/activityFeed';
import type { ActivityItem } from '@/types';
import { CANVAS_LAST_SYNC_KEY } from '@/lib/canvasApi';
import { formatRelativeTime } from '@/hooks/useAutoCanvasSync';

// ── Group items by time bucket ─────────────────────────────────────────────

type Bucket = 'I dag' | 'I går' | 'Denne uge' | 'Ældre';

function getBucket(timestamp: string): Bucket {
  const now = new Date();
  const t = new Date(timestamp);
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now.getTime() - 86400000).toDateString();
  if (t.toDateString() === todayStr) return 'I dag';
  if (t.toDateString() === yesterdayStr) return 'I går';
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  if (t >= weekAgo) return 'Denne uge';
  return 'Ældre';
}

const BUCKET_ORDER: Bucket[] = ['I dag', 'I går', 'Denne uge', 'Ældre'];

// ── Item icons ─────────────────────────────────────────────────────────────

function ItemIcon({ type }: { type: ActivityItem['type'] }) {
  if (type === 'new_file') return <FileText className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
  if (type === 'new_module') return <Layers className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />;
  return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />;
}

function typeLabel(type: ActivityItem['type']): string {
  if (type === 'new_file') return 'Ny fil';
  if (type === 'new_module') return 'Nyt modul';
  return 'Sync';
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    setItems(readFeed());
    markAllSeen();
    window.dispatchEvent(new CustomEvent('sg:activity-seen'));

    const syncStr = localStorage.getItem(CANVAS_LAST_SYNC_KEY);
    if (syncStr) setLastSync(new Date(syncStr));

    // Refresh when feed is updated during the session
    function onStorage(e: StorageEvent) {
      if (e.key === ACTIVITY_FEED_KEY) setItems(readFeed());
      if (e.key === CANVAS_LAST_SYNC_KEY && e.newValue) setLastSync(new Date(e.newValue));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Tick every minute so relative times stay fresh
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const grouped = new Map<Bucket, ActivityItem[]>();
  for (const bucket of BUCKET_ORDER) grouped.set(bucket, []);
  for (const item of items) {
    const b = getBucket(item.timestamp);
    grouped.get(b)!.push(item);
  }

  const hasItems = items.length > 0;

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Aktivitet</h1>
            {lastSync && (
              <p className="text-sm text-gray-400 mt-0.5">
                Sidst synket {formatRelativeTime(lastSync)}
              </p>
            )}
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('sg:open-canvas-sync'))}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Synk nu
          </button>
        </div>

        {/* Empty state */}
        {!hasItems && (
          <div className="rounded-2xl bg-white border border-gray-100 px-6 py-12 text-center space-y-2">
            <Layers className="w-8 h-8 text-gray-200 mx-auto" />
            <p className="text-sm font-medium text-gray-500">Ingen aktivitet endnu</p>
            <p className="text-xs text-gray-400">
              Synk med Canvas for at se nye filer og moduler her.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('sg:open-canvas-sync'))}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gray-900 text-white px-4 py-2 text-xs font-medium hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Canvas sync
            </button>
          </div>
        )}

        {/* Grouped feed */}
        {hasItems && (
          <div className="space-y-6">
            {BUCKET_ORDER.map((bucket) => {
              const bucketItems = grouped.get(bucket)!;
              if (bucketItems.length === 0) return null;
              return (
                <section key={bucket}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{bucket}</p>
                  <ul className="rounded-2xl bg-white border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                    {bucketItems.map((item) => (
                      <li key={item.id} className="flex items-start gap-3 px-4 py-3.5">
                        <ItemIcon type={item.type} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                              {typeLabel(item.type)}
                            </span>
                            {item.courseName && (
                              <span className="text-[10px] text-gray-300">·</span>
                            )}
                            {item.courseName && (
                              <span className="text-[10px] text-gray-400 truncate">{item.courseName}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-800 mt-0.5 leading-snug">{item.title}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-gray-300">{formatRelativeTime(new Date(item.timestamp))}</span>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-300 hover:text-blue-500 transition-colors"
                              title="Åbn fil"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
