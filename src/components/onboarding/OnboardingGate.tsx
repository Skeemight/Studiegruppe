'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { AuthScreen } from '@/components/auth/AuthScreen';

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and the initial client render, show nothing so the server and
  // client produce identical HTML (avoids hydration mismatch).
  // React 18 batches this effect together with the localStorage hydration
  // effects inside useLocalStorage, so users see one immediate transition:
  // blank → correct state (no intermediate auth screen flash).
  if (!mounted) return null;
  if (!currentUser) return <AuthScreen />;
  return <>{children}</>;
}
