'use client';

import { Tabs } from '@base-ui/react/tabs';
import { Book, Headphones } from 'lucide-react';

export type ReaderMode = 'reading' | 'listening';

interface ModeToggleProps {
  mode: ReaderMode;
  onModeChange: (mode: ReaderMode) => void;
  className?: string;
}

export function ModeToggle({ mode, onModeChange, className = '' }: ModeToggleProps) {
  return (
    <Tabs.Root
      value={mode}
      onValueChange={(value) => onModeChange(value as ReaderMode)}
      className={className}
    >
      <Tabs.List className="relative inline-flex items-center gap-1 p-1.5 bg-[hsl(var(--reader-text))]/5 backdrop-blur-sm rounded-2xl border border-[hsl(var(--reader-text))]/8">
        <Tabs.Tab
          value="reading"
          className="relative z-10 flex items-center justify-center gap-2 w-10 sm:w-[88px] py-2 rounded-xl font-semibold text-[13px] transition-all duration-300 outline-none text-[hsl(var(--reader-text))]/40 data-[selected]:text-[hsl(var(--reader-text))] hover:text-[hsl(var(--reader-text))]/60"
        >
          <Book className="w-4 h-4 shrink-0" />
          <span className="tracking-wide hidden sm:inline">Read</span>
        </Tabs.Tab>

        <Tabs.Tab
          value="listening"
          className="relative z-10 flex items-center justify-center gap-2 w-10 sm:w-[88px] py-2 rounded-xl font-semibold text-[13px] transition-all duration-300 outline-none text-[hsl(var(--reader-text))]/40 data-[selected]:text-[hsl(var(--reader-text))] hover:text-[hsl(var(--reader-text))]/60"
        >
          <Headphones className="w-4 h-4 shrink-0" />
          <span className="tracking-wide hidden sm:inline">Listen</span>
        </Tabs.Tab>

        <Tabs.Indicator
          className="absolute inset-y-1.5 bg-[hsl(var(--reader-bg))] border border-[hsl(var(--reader-text))]/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out"
          style={{
            left: 'var(--active-tab-left)',
            width: 'var(--active-tab-width)',
          }}
        />
      </Tabs.List>
    </Tabs.Root>
  );
}
