'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { GraduationCap, Users, ChevronRight, ChevronLeft, Eye, EyeOff, Copy, Check } from 'lucide-react';

// ── Danish institutions ────────────────────────────────────────────────────────

const INSTITUTIONS = [
  'Aarhus Universitet',
  'Aalborg Universitet',
  'Copenhagen Business School',
  'Danmarks Tekniske Universitet',
  'IT-Universitetet i København',
  'Københavns Universitet',
  'Roskilde Universitet',
  'Syddansk Universitet',
  'Absalon – University College',
  'KEA – Københavns Erhvervsakademi',
  'Professionshøjskolen UCN',
  'Professionshøjskolen UCL',
  'UC SYD',
  'UC Sjælland',
  'VIA University College',
  'Cphbusiness',
  'EASJ – Erhvervsakademi Sjælland',
  'EAL – Erhvervsakademi Lillebælt',
  'Erhvervsakademi Aarhus',
  'Erhvervsakademi MidtVest',
  'IBA – Erhvervsakademi Kolding',
  'Zealand – Sjællands Erhvervsakademi',
  'Det Kongelige Akademi',
  'Danmarks Designskole',
  'Rytmisk Musikkonservatorium',
];

// ── Shared field styles ────────────────────────────────────────────────────────

const field = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const label = 'block text-xs font-semibold text-gray-600 mb-1.5';

// ── AuthScreen ─────────────────────────────────────────────────────────────────

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden">
        <div className="px-8 pt-8 pb-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-600 rounded-xl">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Studiegruppe Hub</h1>
              <p className="text-xs text-gray-400">Ingen login påkrævet af alle · Alt gemmes lokalt</p>
            </div>
          </div>
          <div className="flex gap-1 bg-gray-50 p-1 rounded-xl mb-6">
            {(['login', 'signup'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {m === 'login' ? 'Log ind' : 'Opret konto'}
              </button>
            ))}
          </div>
        </div>

        {mode === 'login' ? (
          <LoginForm onSwitch={() => setMode('signup')} />
        ) : (
          <SignupFlow onSwitch={() => setMode('login')} />
        )}

        <p className="text-center text-xs text-gray-300 pb-5 px-8">
          Data gemmes kun i din browser · Ingen server · Ingen tracking
        </p>
      </div>
    </div>
  );
}

// ── Login ──────────────────────────────────────────────────────────────────────

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const { login, findLegacyUser, loginLegacy } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const legacyUser = findLegacyUser();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = login(email.trim(), password);
    if (!result.success) setError(result.error ?? 'Fejl');
  }

  return (
    <form onSubmit={handleSubmit} className="px-8 pb-6 space-y-4">
      <div>
        <label className={label}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="din@email.dk" className={field} autoFocus />
      </div>
      <div>
        <label className={label}>Adgangskode</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" className={`${field} pr-10`} />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button type="submit" disabled={!email || !password}
        className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40">
        Log ind
      </button>
      {legacyUser && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-400 mb-2">Eksisterende lokal bruger fundet:</p>
          <button
            type="button"
            onClick={() => loginLegacy(legacyUser.id)}
            className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Fortsæt som {legacyUser.name}
          </button>
        </div>
      )}
      <p className="text-center text-xs text-gray-400">
        Ikke oprettet endnu?{' '}
        <button type="button" onClick={onSwitch} className="text-blue-600 font-medium hover:underline">
          Opret konto
        </button>
      </p>
    </form>
  );
}

// ── Signup ─────────────────────────────────────────────────────────────────────

type SignupStep = 1 | 2 | 3;
type GroupMode = 'create' | 'join';

function SignupFlow({ onSwitch }: { onSwitch: () => void }) {
  const { signup, createGroup, joinGroup, findGroupByCode } = useApp();

  const [step, setStep] = useState<SignupStep>(1);

  // Step 1
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [step1Error, setStep1Error] = useState('');
  const [pendingUserId, setPendingUserId] = useState('');

  // Step 2
  const [groupMode, setGroupMode] = useState<GroupMode>('create');
  const [groupName, setGroupName] = useState('');
  const [school, setSchool] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [showSchoolList, setShowSchoolList] = useState(false);
  const [program, setProgram] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [step2Error, setStep2Error] = useState('');

  // Step 3
  const [finalInviteCode, setFinalInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredSchools = INSTITUTIONS.filter((s) =>
    s.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setStep1Error('');
    const result = signup(name.trim(), email.trim(), password);
    if (!result.success || !result.userId) {
      setStep1Error(result.error ?? 'Fejl');
      return;
    }
    setPendingUserId(result.userId);
    setStep(2);
  }

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setStep2Error('');
    if (groupMode === 'create') {
      if (!school || !program.trim() || !groupName.trim()) {
        setStep2Error('Udfyld alle felter');
        return;
      }
      const code = createGroup(pendingUserId, groupName.trim(), program.trim(), school);
      setFinalInviteCode(code);
    } else {
      const group = findGroupByCode(inviteInput.trim());
      if (!group) { setStep2Error('Ugyldig invite-kode'); return; }
      const result = joinGroup(pendingUserId, inviteInput.trim());
      if (!result.success) { setStep2Error(result.error ?? 'Fejl'); return; }
    }
    setStep(3);
  }

  function copyCode() {
    navigator.clipboard.writeText(finalInviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Progress bar
  const progress = [
    { n: 1, label: 'Profil' },
    { n: 2, label: 'Gruppe' },
    { n: 3, label: 'Færdig' },
  ];

  return (
    <div className="px-8 pb-6">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        {progress.map(({ n, label: lbl }, i) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
              step > n ? 'bg-blue-600 text-white' : step === n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
            }`}>{n}</div>
            <span className={`text-xs hidden sm:block ${step === n ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{lbl}</span>
            {i < progress.length - 1 && <div className={`h-px flex-1 ${step > n ? 'bg-blue-200' : 'bg-gray-100'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Profile */}
      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-4">
          <div>
            <label className={label}>Navn</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Dit navn" className={field} autoFocus />
          </div>
          <div>
            <label className={label}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="din@email.dk" className={field} />
          </div>
          <div>
            <label className={label}>Adgangskode</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 tegn" className={`${field} pr-10`} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {step1Error && <p className="text-xs text-red-500">{step1Error}</p>}
          <button type="submit" disabled={!name.trim() || !email.trim() || password.length < 6}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            Næste <ChevronRight className="w-4 h-4" />
          </button>
          <p className="text-center text-xs text-gray-400">
            Har du allerede en konto?{' '}
            <button type="button" onClick={onSwitch} className="text-blue-600 font-medium hover:underline">Log ind</button>
          </p>
        </form>
      )}

      {/* Step 2: Group */}
      {step === 2 && (
        <form onSubmit={handleStep2} className="space-y-4">
          <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
            {(['create', 'join'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setGroupMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${groupMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {m === 'create' ? <span className="flex items-center justify-center gap-1.5"><Users className="w-3.5 h-3.5" />Opret gruppe</span> : 'Join gruppe'}
              </button>
            ))}
          </div>

          {groupMode === 'create' ? (
            <>
              <div>
                <label className={label}>Gruppenavn</label>
                <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
                  placeholder="f.eks. HA(it) Studiegruppe" className={field} autoFocus />
              </div>
              <div className="relative">
                <label className={label}>Uddannelsessted</label>
                <input type="text"
                  value={school || schoolSearch}
                  onChange={(e) => { setSchoolSearch(e.target.value); setSchool(''); setShowSchoolList(true); }}
                  onFocus={() => setShowSchoolList(true)}
                  placeholder="Søg efter institution..."
                  className={field} />
                {showSchoolList && !school && filteredSchools.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {filteredSchools.map((s) => (
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
                <input type="text" value={program} onChange={(e) => setProgram(e.target.value)}
                  placeholder="f.eks. HA(it), Datalogi, Softwareudvikling..." className={field} />
              </div>
            </>
          ) : (
            <div>
              <label className={label}>Invite-kode</label>
              <input type="text" value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
                placeholder="XXXXXX" maxLength={6}
                className={`${field} font-mono tracking-widest uppercase text-center text-lg`} autoFocus />
              <p className="text-xs text-gray-400 mt-1.5">Bed en gruppemedlem om at dele koden fra sidebaren</p>
            </div>
          )}

          {step2Error && <p className="text-xs text-red-500">{step2Error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Tilbage
            </button>
            <button type="submit"
              disabled={groupMode === 'create' ? (!groupName.trim() || !school || !program.trim()) : inviteInput.length !== 6}
              className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40">
              {groupMode === 'create' ? 'Opret gruppe' : 'Join gruppe'}
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <div className="space-y-5 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-2xl">✓</span>
          </div>
          <div>
            <h2 className="font-bold text-gray-900">{groupMode === 'create' ? 'Gruppe oprettet!' : 'Du er med i gruppen!'}</h2>
            <p className="text-sm text-gray-500 mt-1">Du er nu klar til at bruge Studiegruppe Hub.</p>
          </div>
          {groupMode === 'create' && finalInviteCode && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-600 mb-2">Del denne kode med dine gruppemedlemmer</p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-2xl font-bold tracking-widest text-blue-700">{finalInviteCode}</span>
                <button onClick={copyCode}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-blue-400 mt-2">Koden er også synlig i sidebaren</p>
            </div>
          )}
          <p className="text-xs text-gray-400">Du bliver automatisk ført ind i appen...</p>
        </div>
      )}
    </div>
  );
}
