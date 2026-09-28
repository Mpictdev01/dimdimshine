'use client';

import { createClient } from '@supabase/supabase-js';

// Compatibility transport for existing screens. Every request goes to the
// authenticated Next.js route; no database key or Supabase URL is used here.
export const browserDataClient = createClient('https://pos.internal.invalid', 'server-session', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input, init) => {
      const upstream = new URL(typeof input === 'string' ? input : input.toString());
      const match = upstream.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
      if (!match) throw new Error('Endpoint data tidak diizinkan');
      const headers = new Headers(init?.headers);
      headers.delete('apikey');
      headers.delete('authorization');
      return fetch(`/api/data/${match[1]}${upstream.search}`, {
        ...init, headers, credentials: 'same-origin', cache: 'no-store',
      });
    },
  },
});
