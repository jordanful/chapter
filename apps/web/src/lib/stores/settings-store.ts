import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'sepia';
export type FontSize = 'small' | 'medium' | 'large';

interface TTSSettings {
  voiceId: string;
  speed: number;
  temperature: number;
}

interface SettingsState {
  theme: Theme;
  fontSize: FontSize;
  tts: TTSSettings;
  setTheme: (theme: Theme) => void;
  setFontSize: (fontSize: FontSize) => void;
  setTTSSettings: (settings: Partial<TTSSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      fontSize: 'medium',
      tts: {
        voiceId: 'af_bella',
        speed: 1.0,
        temperature: 0.7,
      },
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setTTSSettings: (settings) =>
        set((state) => ({
          tts: { ...state.tts, ...settings },
        })),
    }),
    {
      name: 'chapter-settings',
    }
  )
);

// Apply theme to document
export function applyTheme(theme: Theme) {
  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove('light', 'dark', 'sepia');

  // Add new theme class
  root.classList.add(theme);

  // Update color-scheme for native elements
  if (theme === 'light' || theme === 'sepia') {
    root.style.colorScheme = 'light';
  } else {
    root.style.colorScheme = 'dark';
  }
}

// Apply font size to document
export function applyFontSize(fontSize: FontSize) {
  const root = document.documentElement;

  // Remove existing font size classes
  root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');

  // Add new font size class
  root.classList.add(`font-size-${fontSize}`);
}
