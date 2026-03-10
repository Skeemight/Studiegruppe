import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = !!(url && key);

export function createClient() {
  if (!url || !key) {
    throw new Error('Supabase-miljøvariabler mangler. Opret src/.env.local med NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return createBrowserClient(url, key);
}

// Singleton for use in client components
let _client: ReturnType<typeof createClient> | null = null;
export function getSupabase() {
  if (!_client) _client = createClient();
  return _client;
}
