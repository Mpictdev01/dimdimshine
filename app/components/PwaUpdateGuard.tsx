'use client';

import { useEffect } from 'react';

export default function PwaUpdateGuard() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const reload = () => window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange', reload);
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then(registration => registration.update()).catch(() => {});
    return () => navigator.serviceWorker.removeEventListener('controllerchange', reload);
  }, []);
  return null;
}
