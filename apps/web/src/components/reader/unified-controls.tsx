'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { ModeToggle, ReaderMode } from './ModeToggle';

interface UnifiedControlsProps {
  // Book info
  book: any;
  currentChapter: number;
  totalChapters: number;
  bookProgress: number;

  // Actions
  onBack: () => void;
  onToggleNav: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  hasPrev: boolean;
  hasNext: boolean;

  // Mode
  mode: ReaderMode;
  onModeChange: (mode: ReaderMode) => void;
}

export function UnifiedControls({
  book,
  currentChapter,
  totalChapters,
  bookProgress,
  onBack,
  onToggleNav,
  onPrevChapter,
  onNextChapter,
  hasPrev,
  hasNext,
  mode,
  onModeChange,
}: UnifiedControlsProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // Show if at top
          if (currentScrollY < 50) {
            setIsVisible(true);
          }
          // Show when scrolling up, hide when scrolling down
          else if (currentScrollY < lastScrollY) {
            setIsVisible(true);
          } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
            setIsVisible(false);
          }

          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Always show when user taps screen (for mobile)
  useEffect(() => {
    const handleTouch = () => {
      setIsVisible(true);
      // Auto-hide after 3 seconds
      setTimeout(() => {
        if (window.scrollY > 100) {
          setIsVisible(false);
        }
      }, 3000);
    };

    document.addEventListener('touchstart', handleTouch, { passive: true });
    return () => document.removeEventListener('touchstart', handleTouch);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="bg-[hsl(var(--reader-bg))]/98 backdrop-blur-lg border-t border-border/50 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-foreground/5">
          <div
            className="h-full bg-[hsl(var(--reader-accent))] transition-all duration-300 ease-out"
            style={{ width: `${bookProgress}%` }}
          />
        </div>

        <div className="max-w-[42rem] mx-auto px-4 py-2 flex items-center justify-between gap-4">
          {/* Left: Back + Book info */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="hover:bg-accent/50 transition-colors h-7 w-7"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>

            <div className="flex-1 min-w-0">
              <h1 className="text-[11px] font-serif font-medium truncate text-[hsl(var(--reader-text))] leading-tight">
                {book?.title}
              </h1>
              <p className="text-[9px] text-muted-foreground font-medium tracking-wide leading-tight">
                Ch. {currentChapter + 1}/{totalChapters} • {Math.round(bookProgress)}%
              </p>
            </div>
          </div>

          {/* Center: Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevChapter}
              disabled={!hasPrev}
              className="hover:bg-accent/50 disabled:opacity-40 h-7 w-7"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNextChapter}
              disabled={!hasNext}
              className="hover:bg-accent/50 disabled:opacity-40 h-7 w-7"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Right: Mode + Menu */}
          <div className="flex items-center gap-1">
            <ModeToggle mode={mode} onModeChange={onModeChange} />
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleNav}
              className="hover:bg-accent/50 transition-colors h-7 w-7"
            >
              <Menu className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
