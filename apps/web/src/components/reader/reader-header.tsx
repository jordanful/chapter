'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Menu } from 'lucide-react';

interface ReaderHeaderProps {
  book: any;
  currentChapter: number;
  totalChapters: number;
  onBack: () => void;
  onToggleNav: () => void;
}

export function ReaderHeader({
  book,
  currentChapter,
  totalChapters,
  onBack,
  onToggleNav,
}: ReaderHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-10 transition-all duration-300 ${
        isScrolled
          ? 'bg-[hsl(var(--reader-bg))]/98 backdrop-blur-lg border-b border-border/50 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[42rem] mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="hover:bg-accent/50 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div
            className={`flex-1 min-w-0 transition-opacity duration-300 ${
              isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <h1 className="text-sm font-serif font-medium truncate text-[hsl(var(--reader-text))]">
              {book.title}
            </h1>
            <p className="text-xs text-muted-foreground font-medium tracking-wide">
              {currentChapter + 1} of {totalChapters}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleNav}
          className="hover:bg-accent/50 transition-colors duration-200"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
