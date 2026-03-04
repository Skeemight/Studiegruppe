import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/store/AppContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Studiegruppe Hub',
  description: 'Administrer din studiegruppes fag, opgaver, dokumenter og eksamener.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <AppProvider>
          <OnboardingGate>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <TopBar />
                <main className="flex-1 overflow-y-auto p-6">
                  {children}
                </main>
              </div>
            </div>
          </OnboardingGate>
        </AppProvider>
      </body>
    </html>
  );
}
