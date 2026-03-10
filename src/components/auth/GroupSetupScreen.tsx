'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { GraduationCap, Users, Copy, Check } from 'lucide-react';

const INSTITUTIONS = [
  'Aarhus Universitet', 'Aalborg Universitet', 'Copenhagen Business School',
  'Danmarks Tekniske Universitet', 'IT-Universitetet i København', 'Københavns Universitet',
  'Roskilde Universitet', 'Syddansk Universitet', 'Absalon – University College',
  'KEA – Københavns Erhvervsakademi', 'Professionshøjskolen UCN', 'Professionshøjskolen UCL',
  'UC SYD', 'UC Sjælland', 'VIA University College', 'Cphbusiness',
  'EASJ – Erhvervsakademi Sjælland', 'EAL – Erhvervsakademi Lillebælt',
  'Erhvervsakademi Aarhus', 'Erhvervsakademi MidtVest', 'IBA – Erhvervsakademi Kolding',
  'Zealand – Sjællands Erhvervsakademi', 'Det Kongelige Akademi',
  'Danmarks Designskole', 'Rytmisk Musikkonservatorium',
];

const field = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const label = 'block text-xs font-semibold text-gray-600 mb-1.5';

export function GroupSetupScreen({ userId }: { userId: string }) {
  const { createGroup, joinGroup, logout } = useApp();

  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Create form
  const [groupName, setGroupName] = useState('');
  const [school, setSchool] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [showSchoolList, setShowSchoolList] = useState(false);
  const [program, setProgram] = useState('');

  // Join form
  const [inviteInput, setInviteInput] = useState('');

  const filteredSchools = INSTITUTIONS.filter(s =>
    s.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      if (mode === 'create') {
        const code = await createGroup(userId, groupName.trim(), program.trim(), school);
        setInviteCode(code);
      } else {
        const result = await joinGroup(userId, inviteInput.trim());
        if (!result.success) { setError(result.error ?? 'Ugyldig kode'); return; }
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl');
    } finally {
      setSubmitting(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden">
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-600 rounded-xl">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Studiegruppe Hub</h1>
              <p className="text-xs text-gray-400">Opret eller tilslut dig en gruppe</p>
            </div>
          </div>

          {done ? (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl">✓</span>
              </div>
              <div>
                <h2 className="font-bold text-gray-900">{mode === 'create' ? 'Gruppe oprettet!' : 'Du er med i gruppen!'}</h2>
                <p className="text-sm text-gray-500 mt-1">Du er nu klar til at bruge Studiegruppe Hub.</p>
              </div>
              {mode === 'create' && inviteCode && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-600 mb-2">Del denne kode med dine gruppemedlemmer</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono text-2xl font-bold tracking-widest text-blue-700">{inviteCode}</span>
                    <button onClick={copyCode} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400">Du bliver automatisk ført ind i appen…</p>
            </div>
          ) : (
            <>
              <div className="flex gap-1 bg-gray-50 p-1 rounded-xl mb-5">
                {(['create', 'join'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                    {m === 'create'
                      ? <span className="flex items-center justify-center gap-1.5"><Users className="w-3.5 h-3.5" />Opret gruppe</span>
                      : 'Join gruppe'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'create' ? (
                  <>
                    <div>
                      <label className={label}>Gruppenavn</label>
                      <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)}
                        placeholder="f.eks. HA(it) Studiegruppe" className={field} autoFocus />
                    </div>
                    <div className="relative">
                      <label className={label}>Uddannelsessted</label>
                      <input type="text"
                        value={school || schoolSearch}
                        onChange={e => { setSchoolSearch(e.target.value); setSchool(''); setShowSchoolList(true); }}
                        onFocus={() => setShowSchoolList(true)}
                        placeholder="Søg efter institution…"
                        className={field} />
                      {showSchoolList && !school && filteredSchools.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                          {filteredSchools.map(s => (
                            <button key={s} type="button"
                              onMouseDown={() => { setSchool(s); setSchoolSearch(s); setShowSchoolList(false); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-gray-800">
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className={label}>Uddannelse</label>
                      <input type="text" value={program} onChange={e => setProgram(e.target.value)}
                        placeholder="f.eks. HA(it), Datalogi, Softwareudvikling…" className={field} />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className={label}>Invite-kode</label>
                    <input type="text" value={inviteInput}
                      onChange={e => setInviteInput(e.target.value.toUpperCase())}
                      placeholder="XXXXXX" maxLength={6}
                      className={`${field} font-mono tracking-widest uppercase text-center text-lg`} autoFocus />
                    <p className="text-xs text-gray-400 mt-1.5">Bed en gruppemedlem om at dele koden fra sidebaren</p>
                  </div>
                )}

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button type="submit"
                  disabled={submitting || (mode === 'create' ? (!groupName.trim() || !school || !program.trim()) : inviteInput.length !== 6)}
                  className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40">
                  {submitting ? 'Gemmer…' : mode === 'create' ? 'Opret gruppe' : 'Join gruppe'}
                </button>

                <p className="text-center text-xs text-gray-400">
                  <button type="button" onClick={() => logout()} className="hover:underline text-gray-400">
                    Log ud
                  </button>
                </p>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-300 pb-5">
          Data synkroniseres sikkert via Supabase
        </p>
      </div>
    </div>
  );
}
