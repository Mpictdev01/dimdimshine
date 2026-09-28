import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Supabase types will be generated from the staging database after connector access is restored.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: ReturnType<typeof createClient<any>> | undefined;

export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Konfigurasi database server belum lengkap');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client ??= createClient<any>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
