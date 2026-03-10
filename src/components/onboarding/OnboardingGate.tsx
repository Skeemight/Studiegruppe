'use client';

import { useApp } from '@/store/AppContext';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { GroupSetupScreen } from '@/components/auth/GroupSetupScreen';

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { currentUser, currentGroup, loading } = useApp();

  // Show a minimal loading state while Supabase resolves the session
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-cream">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-warm/40 border-t-terra rounded-full animate-spin mx-auto" />
        <p className="text-sm text-warm font-mono">Indlæser…</p>
      </div>
    </div>
  );
  if (!currentUser) return <AuthScreen />;
  if (!currentGroup) return <GroupSetupScreen userId={currentUser.id} />;
  return <>{children}</>;
}
