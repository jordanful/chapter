'use client';

import { useEffect } from 'react';
import { useSettingsStore, applyTheme, applyFontSize } from '@/lib/stores/settings-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, fontSize } = useSettingsStore();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyFontSize(fontSize);
  }, [fontSize]);

  return <>{children}</>;
}
