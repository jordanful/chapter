'use client';

import { Tabs } from '@base-ui/react/tabs';
import { Book, Headphones, WifiOff } from 'lucide-react';

export type ReaderMode = 'reading' | 'listening';

interface ModeToggleProps {
  mode: ReaderMode;
  onModeChange: (mode: ReaderMode) => void;
  className?: string;
  disableListening?: boolean;
  disableListeningReason?: string;
}

export function ModeToggle({
  mode,
  onModeChange,
  className = '',
  disableListening = false,
  disableListeningReason,
}: ModeToggleProps) {
  const handleValueChange = (value: string | null) => {
    if (value === 'listening' && disableListening) return;
    if (value) onModeChange(value as ReaderMode);
  };

  return (
    <Tabs.Root value={mode} onValueChange={handleValueChange} className={className}>
      <Tabs.List className="relative inline-flex items-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 bg-[hsl(var(--reader-text))]/5 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-[hsl(var(--reader-text))]/8">
        <Tabs.Tab
          value="reading"
          className="relative z-10 flex items-center justify-center gap-2 w-8 sm:w-[88px] py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold text-[13px] transition-all duration-300 outline-none text-[hsl(var(--reader-text))]/40 data-[selected]:text-[hsl(var(--reader-text))] hover:text-[hsl(var(--reader-text))]/60"
        >
          <Book className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="tracking-wide hidden sm:inline">Read</span>
        </Tabs.Tab>

        <Tabs.Tab
          value="listening"
          disabled={disableListening}
          title={disableListening ? disableListeningReason : undefined}
          className={`relative z-10 flex items-center justify-center gap-2 w-8 sm:w-[88px] py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold text-[13px] transition-all duration-300 outline-none ${
            disableListening
              ? 'text-[hsl(var(--reader-text))]/20 cursor-not-allowed'
              : 'text-[hsl(var(--reader-text))]/40 data-[selected]:text-[hsl(var(--reader-text))] hover:text-[hsl(var(--reader-text))]/60'
          }`}
        >
          {disableListening ? (
            <WifiOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          ) : (
            <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          )}
          <span className="tracking-wide hidden sm:inline">Listen</span>
        </Tabs.Tab>

        <Tabs.Indicator
          className="absolute inset-y-1 sm:inset-y-1.5 bg-[hsl(var(--reader-bg))] border border-[hsl(var(--reader-text))]/10 rounded-lg sm:rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out"
          style={{
            left: 'var(--active-tab-left)',
            width: 'var(--active-tab-width)',
          }}
        />
      </Tabs.List>
    </Tabs.Root>
  );
}
