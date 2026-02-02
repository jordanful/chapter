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
      <Tabs.List className="relative inline-flex items-center p-1.5 bg-black/[0.06] dark:bg-white/[0.06] rounded-xl">
        <Tabs.Tab
          value="reading"
          className="relative z-10 flex items-center gap-2.5 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 outline-none text-black/30 dark:text-white/30 data-[selected]:text-black dark:data-[selected]:text-white"
        >
          <Book className="w-[18px] h-[18px]" />
          <span>Read</span>
        </Tabs.Tab>

        <Tabs.Tab
          value="listening"
          className="relative z-10 flex items-center gap-2.5 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 outline-none text-black/30 dark:text-white/30 data-[selected]:text-black dark:data-[selected]:text-white"
        >
          <Headphones className="w-[18px] h-[18px]" />
          <span>Listen</span>
        </Tabs.Tab>

        <Tabs.Indicator
          className="absolute bg-white dark:bg-white/10 rounded-lg shadow-sm transition-all duration-300 ease-out"
          style={{
            left: 'var(--active-tab-left)',
            width: 'var(--active-tab-width)',
            top: '6px',
            bottom: '6px',
          }}
        />
      </Tabs.List>
    </Tabs.Root>
  );
}
