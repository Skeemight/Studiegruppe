'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { getSupabase } from '@/lib/supabase';
import { getCourseModules } from '@/lib/courseUtils';

export default function DebugPage() {
  const { courses, documents, canvasModules, currentGroup } = useApp();
  const [rawDocs, setRawDocs] = useState<Record<string, unknown>[] | null>(null);
  const [rawModules, setRawModules] = useState<Record<string, unknown>[] | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  // Direct Supabase query — bypass AppContext entirely
  useEffect(() => {
    if (!currentGroup) return;
    const sb = getSupabase();
    Promise.all([
      sb.from('documents').select('*').eq('group_id', currentGroup.id),
      sb.from('canvas_modules').select('id, course_id, name, position, week').eq('group_id', currentGroup.id),
    ]).then(([docsRes, modsRes]) => {
      if (docsRes.error) setDbError('documents: ' + docsRes.error.message);
      else if (modsRes.error) setDbError('canvas_modules: ' + modsRes.error.message);
      else {
        setRawDocs(docsRes.data as Record<string, unknown>[]);
        setRawModules(modsRes.data as Record<string, unknown>[]);
      }
    });
  }, [currentGroup]);

  const prog = courses.find(c =>
    c.name.toLowerCase().includes('programm') || c.name.toLowerCase().includes('prog')
  );

  const row = (label: string, value: unknown, red = false) => (
    <tr key={label}>
      <td style={{ padding: '4px 8px', fontWeight: 600, color: '#555', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{label}</td>
      <td style={{ padding: '4px 8px', color: red ? 'red' : '#111', fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '–')}
      </td>
    </tr>
  );

  const section = (title: string, children: React.ReactNode) => (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, borderBottom: '2px solid #000', paddingBottom: 4 }}>{title}</h2>
      {children}
    </div>
  );

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 13, padding: 24, maxWidth: 1200, color: '#111' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>DEBUG PAGE</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>
        group_id: {currentGroup?.id ?? 'INGEN GRUPPE'} &nbsp;|&nbsp;
        courses: {courses.length} &nbsp;|&nbsp;
        documents (AppContext): {documents.length} &nbsp;|&nbsp;
        canvasModules (AppContext): {canvasModules.length}
      </p>

      {dbError && (
        <div style={{ background: '#fee', border: '1px solid red', padding: 12, marginBottom: 24, color: 'red' }}>
          DB FEJL: {dbError}
        </div>
      )}

      {/* ── TASK 1: All courses comparison ── */}
      {section('TASK 1 — Alle fag: dokument-tælling pr. metode', (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #ccc' }}>Kurs navn</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #ccc' }}>Course ID (intern)</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #ccc' }}>Docs-side tæller<br/><small>(documents.filter(d =&gt; d.courseId === c.id))</small></th>
              <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #ccc' }}>Fag-side tæller<br/><small>(getCourseModules → module.items)</small></th>
              <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #ccc' }}>DB docs (rå)<br/><small>(select * where course_id = id)</small></th>
              <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #ccc' }}>DB moduler<br/><small>(canvas_modules.course_id = id)</small></th>
              <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #ccc' }}>Forskel?</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(c => {
              const docsPageCount = documents.filter(d => d.courseId === c.id).length;
              const fagModules = getCourseModules(c.id, canvasModules);
              const fagItemCount = fagModules.reduce((sum, m) =>
                sum + m.items.filter(i => i.type !== 'SubHeader' && i.url).length, 0);
              const dbDocCount = rawDocs ? rawDocs.filter(d => d.course_id === c.id).length : '...';
              const dbModuleCount = rawModules ? rawModules.filter(m => m.course_id === c.id).length : '...';
              const diff = typeof dbDocCount === 'number' && docsPageCount !== dbDocCount;
              return (
                <tr key={c.id} style={{ background: diff ? '#fff0f0' : undefined }}>
                  <td style={{ padding: '6px 8px', border: '1px solid #eee', fontWeight: 600 }}>{c.name}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #eee', fontFamily: 'monospace', fontSize: 11 }}>{c.id}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #eee', textAlign: 'center' }}>{docsPageCount}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #eee', textAlign: 'center' }}>{fagItemCount}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #eee', textAlign: 'center', color: diff ? 'red' : undefined }}>{String(dbDocCount)}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #eee', textAlign: 'center' }}>{String(dbModuleCount)}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #eee', color: diff ? 'red' : 'green', fontWeight: 700 }}>
                    {diff ? 'JA' : 'nej'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ))}

      {/* ── TASK 2: Programmering deep-dive ── */}
      {section('TASK 2 — Programmering: fuld detalje', prog ? (
        <div>
          <h3 style={{ marginBottom: 8 }}>2a. Rå course-objekt (AppContext)</h3>
          <pre style={{ background: '#f5f5f5', padding: 12, overflow: 'auto', fontSize: 12 }}>
            {JSON.stringify(prog, null, 2)}
          </pre>

          <h3 style={{ marginTop: 20, marginBottom: 8 }}>2b. Dokumenter-sidens forespørgsel</h3>
          <p style={{ color: '#555', marginBottom: 8 }}>
            <code>documents.filter(d =&gt; d.courseId === &quot;{prog.id}&quot;)</code>
          </p>
          <p><strong>Resultat: {documents.filter(d => d.courseId === prog.id).length} dokumenter</strong></p>
          {documents.filter(d => d.courseId === prog.id).length === 0 ? (
            <p style={{ color: 'red' }}>INGEN dokumenter matcher course_id = {prog.id}</p>
          ) : (
            <pre style={{ background: '#f5f5f5', padding: 12, overflow: 'auto', fontSize: 11, maxHeight: 300 }}>
              {JSON.stringify(documents.filter(d => d.courseId === prog.id), null, 2)}
            </pre>
          )}

          <h3 style={{ marginTop: 20, marginBottom: 8 }}>2c. Fag-sidens forespørgsel</h3>
          <p style={{ color: '#555', marginBottom: 8 }}>
            <code>getCourseModules(&quot;{prog.id}&quot;, canvasModules) → module.items</code>
          </p>
          {(() => {
            const mods = getCourseModules(prog.id, canvasModules);
            const items = mods.flatMap(m => m.items.filter(i => i.type !== 'SubHeader' && i.url));
            return (
              <>
                <p><strong>Moduler: {mods.length}, Items: {items.length}</strong></p>
                <pre style={{ background: '#f5f5f5', padding: 12, overflow: 'auto', fontSize: 11, maxHeight: 300 }}>
                  {JSON.stringify(mods.map(m => ({ id: m.id, courseId: m.courseId, name: m.name, itemCount: m.items.length })), null, 2)}
                </pre>
              </>
            );
          })()}

          <h3 style={{ marginTop: 20, marginBottom: 8 }}>2d. Rå DB: documents WHERE course_id = &apos;{prog.id}&apos;</h3>
          {rawDocs === null ? (
            <p>Indlæser...</p>
          ) : (
            <>
              <p><strong>DB resultat: {rawDocs.filter(d => d.course_id === prog.id).length} rækker</strong></p>
              <pre style={{ background: '#f5f5f5', padding: 12, overflow: 'auto', fontSize: 11, maxHeight: 300 }}>
                {JSON.stringify(rawDocs.filter(d => d.course_id === prog.id), null, 2)}
              </pre>
            </>
          )}

          <h3 style={{ marginTop: 20, marginBottom: 8 }}>2e. Rå DB: canvas_modules WHERE course_id = &apos;{prog.id}&apos;</h3>
          {rawModules === null ? (
            <p>Indlæser...</p>
          ) : (
            <>
              <p><strong>DB resultat: {rawModules.filter(m => m.course_id === prog.id).length} rækker</strong></p>
              <pre style={{ background: '#f5f5f5', padding: 12, overflow: 'auto', fontSize: 11, maxHeight: 300 }}>
                {JSON.stringify(rawModules.filter(m => m.course_id === prog.id), null, 2)}
              </pre>
            </>
          )}

          <h3 style={{ marginTop: 20, marginBottom: 8, color: 'red' }}>2f. FORSKEL — hvad stemmer ikke?</h3>
          {(() => {
            const docsCount = documents.filter(d => d.courseId === prog.id).length;
            const dbCount = rawDocs ? rawDocs.filter(d => d.course_id === prog.id).length : null;
            const fagMods = getCourseModules(prog.id, canvasModules);
            const fagItems = fagMods.flatMap(m => m.items.filter(i => i.type !== 'SubHeader' && i.url)).length;
            const issues: string[] = [];
            if (dbCount !== null && docsCount !== dbCount) {
              issues.push(`AppContext har ${docsCount} docs men DB har ${dbCount} — AppContext er ikke synkroniseret med DB`);
            }
            if (fagMods.length === 0 && docsCount > 0) {
              issues.push(`Ingen canvas-moduler men ${docsCount} dokumenter i docs-tabellen — fag-siden vil vise dokumenterne som flat liste`);
            }
            if (fagItems === 0 && docsCount === 0) {
              issues.push(`BEGGE metoder finder 0 filer for Programmering`);
            }
            // Check if any docs exist in DB with a DIFFERENT course_id that might belong to Programmering
            const allCourseIds = rawDocs ? [...new Set(rawDocs.map(d => d.course_id))] : [];
            const unknownIds = allCourseIds.filter(id => !courses.find(c => c.id === id));
            if (unknownIds.length > 0) {
              issues.push(`DB har dokumenter med course_id'er der IKKE matcher nogen kurs i AppContext: ${unknownIds.join(', ')}`);
            }
            return issues.length === 0 ? (
              <p style={{ color: 'green' }}>Ingen uoverensstemmelser fundet.</p>
            ) : (
              <ul style={{ color: 'red', paddingLeft: 20 }}>
                {issues.map((issue, i) => <li key={i} style={{ marginBottom: 8 }}>{issue}</li>)}
              </ul>
            );
          })()}
        </div>
      ) : (
        <p style={{ color: 'red' }}>
          Ingen kursus fundet med &apos;programm&apos; i navnet. Kurser:{' '}
          {courses.map(c => `"${c.name}"`).join(', ')}
        </p>
      ))}

      {/* ── All documents raw dump ── */}
      {section('EKSTRA — Alle documents i AppContext (course_id → title)', (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #ccc' }}>id</th>
              <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #ccc' }}>courseId</th>
              <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #ccc' }}>kursus navn</th>
              <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #ccc' }}>title</th>
            </tr>
          </thead>
          <tbody>
            {documents.map(d => {
              const cname = courses.find(c => c.id === d.courseId)?.name;
              return (
                <tr key={d.id} style={{ background: !cname ? '#fff8e0' : undefined }}>
                  <td style={{ padding: '3px 8px', border: '1px solid #eee', fontSize: 11, fontFamily: 'monospace' }}>{d.id.slice(0, 16)}…</td>
                  <td style={{ padding: '3px 8px', border: '1px solid #eee', fontSize: 11, fontFamily: 'monospace', color: !cname ? 'orange' : undefined }}>{d.courseId ?? '–'}</td>
                  <td style={{ padding: '3px 8px', border: '1px solid #eee' }}>{cname ?? <span style={{ color: 'orange' }}>INGEN MATCH</span>}</td>
                  <td style={{ padding: '3px 8px', border: '1px solid #eee' }}>{d.title}</td>
                </tr>
              );
            })}
            {documents.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 12, textAlign: 'center', color: '#aaa' }}>Ingen dokumenter i AppContext</td></tr>
            )}
          </tbody>
        </table>
      ))}
    </div>
  );
}
