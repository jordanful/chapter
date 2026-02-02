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
      <Tabs.List className="relative inline-flex items-center p-1 bg-black/[0.06] dark:bg-white/[0.06] rounded-lg">
        <Tabs.Tab
          value="reading"
          className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all duration-200 outline-none text-black/40 dark:text-white/40 data-[selected]:text-black dark:data-[selected]:text-white"
        >
          <Book className="w-3.5 h-3.5" />
          <span>Read</span>
        </Tabs.Tab>

        <Tabs.Tab
          value="listening"
          className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all duration-200 outline-none text-black/40 dark:text-white/40 data-[selected]:text-black dark:data-[selected]:text-white"
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>Listen</span>
        </Tabs.Tab>

        <Tabs.Indicator
          className="absolute bg-white dark:bg-white/10 rounded-md shadow-sm transition-all duration-300 ease-out"
          style={{
            left: 'var(--active-tab-left)',
            width: 'var(--active-tab-width)',
            top: '4px',
            bottom: '4px',
          }}
        />
      </Tabs.List>
    </Tabs.Root>
  );
}
