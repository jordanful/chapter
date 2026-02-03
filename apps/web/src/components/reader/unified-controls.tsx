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
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      {/* Refined gradient backdrop */}
      <div className="relative bg-gradient-to-b from-[hsl(var(--reader-bg))]/95 via-[hsl(var(--reader-bg))]/98 to-[hsl(var(--reader-bg))] backdrop-blur-2xl border-t border-[hsl(var(--reader-text))]/8">
        {/* Elegant top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--reader-accent))]/30 to-transparent" />

        {/* Refined progress bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[hsl(var(--reader-text))]/4">
          <div
            className="h-full bg-gradient-to-r from-[hsl(var(--reader-accent))]/80 to-[hsl(var(--reader-accent))] shadow-[0_0_8px_rgba(var(--reader-accent-rgb),0.3)] transition-all duration-500 ease-out"
            style={{ width: `${bookProgress}%` }}
          />
        </div>

        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-5">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-8">
            {/* Left: Back button + Book info */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={onBack}
                className="group flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[hsl(var(--reader-text))]/5 hover:bg-[hsl(var(--reader-text))]/10 transition-all duration-300 hover:scale-105 active:scale-95 shrink-0"
                aria-label="Back to library"
              >
                <ArrowLeft className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] text-[hsl(var(--reader-text))]/60 group-hover:text-[hsl(var(--reader-text))] transition-colors duration-300" />
              </button>

              <div className="hidden sm:flex flex-col min-w-0 gap-1">
                <h1 className="text-base font-semibold truncate text-[hsl(var(--reader-text))] tracking-tight leading-none">
                  {book?.title}
                </h1>
                <p className="text-[13px] text-[hsl(var(--reader-text))]/50 font-medium tracking-wide leading-none">
                  Chapter {currentChapter + 1} of {totalChapters}
                </p>
              </div>
            </div>

            {/* Center: Chapter navigation */}
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <button
                onClick={onPrevChapter}
                disabled={!hasPrev}
                className="group flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[hsl(var(--reader-text))]/5 hover:bg-[hsl(var(--reader-text))]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95"
                aria-label="Previous chapter"
              >
                <ChevronLeft className="w-5 h-5 text-[hsl(var(--reader-text))]/60 group-hover:text-[hsl(var(--reader-text))] transition-colors duration-300" />
              </button>

              {/* Progress indicator */}
              <div className="flex items-center justify-center min-w-[50px] sm:min-w-[60px] h-10 sm:h-11 px-3 sm:px-4 rounded-full bg-[hsl(var(--reader-text))]/5 border border-[hsl(var(--reader-text))]/8">
                <span className="text-xs sm:text-sm font-semibold text-[hsl(var(--reader-text))]/70 tabular-nums">
                  {Math.round(bookProgress)}%
                </span>
              </div>

              <button
                onClick={onNextChapter}
                disabled={!hasNext}
                className="group flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[hsl(var(--reader-text))]/5 hover:bg-[hsl(var(--reader-text))]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95"
                aria-label="Next chapter"
              >
                <ChevronRight className="w-5 h-5 text-[hsl(var(--reader-text))]/60 group-hover:text-[hsl(var(--reader-text))] transition-colors duration-300" />
              </button>
            </div>

            {/* Right: Mode toggle + Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              <ModeToggle mode={mode} onModeChange={onModeChange} />

              <button
                onClick={onToggleNav}
                className="group flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[hsl(var(--reader-text))]/5 hover:bg-[hsl(var(--reader-text))]/10 transition-all duration-300 hover:scale-105 active:scale-95 shrink-0"
                aria-label="Open menu"
              >
                <Menu className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] text-[hsl(var(--reader-text))]/60 group-hover:text-[hsl(var(--reader-text))] transition-colors duration-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Subtle bottom shadow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--reader-text))]/5 to-transparent" />
      </div>
    </div>
  );
}
