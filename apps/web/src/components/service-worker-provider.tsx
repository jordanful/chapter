'use client';

import { useEffect } from 'react';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available - could show a toast here in the future
                  console.log('New version available');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service worker registration failed:', error);
        });
    }
  }, []);

  return <>{children}</>;
}
