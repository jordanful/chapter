'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSettingsStore, applyTheme, applyFontSize } from '@/lib/stores/settings-store';

// Pages that should always use dark theme (bookshelf UI)
const DARK_ONLY_PATHS = ['/library', '/settings'];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, fontSize } = useSettingsStore();
  const pathname = usePathname();

  useEffect(() => {
    // Only apply user's theme on pages that support it (reader, etc.)
    // Library and settings always use dark theme
    const isDarkOnlyPage = DARK_ONLY_PATHS.some((path) => pathname?.startsWith(path));
    if (isDarkOnlyPage) {
      applyTheme('dark');
    } else {
      applyTheme(theme);
    }
  }, [theme, pathname]);

  useEffect(() => {
    applyFontSize(fontSize);
  }, [fontSize]);

  return <>{children}</>;
}
