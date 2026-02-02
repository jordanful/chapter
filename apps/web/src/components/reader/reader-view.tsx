'use client';

import { useEffect, useRef, useState } from 'react';
import { fixEncodingIssues } from '@/lib/text-cleanup';

interface ReaderViewProps {
  chapter: any;
  isLoading: boolean;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onScrollChange?: (scrollPosition: number) => void;
  initialScrollPosition?: number;
  bookProgress?: number; // Overall progress through the book (0-100)
}

export function ReaderView({
  chapter,
  isLoading,
  onPrevChapter,
  onNextChapter,
  hasPrev,
  hasNext,
  onScrollChange,
  initialScrollPosition,
  bookProgress = 0,
}: ReaderViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const hasRestoredScroll = useRef(false);
  const restoreTimeouts = useRef<NodeJS.Timeout[]>([]);

  // Animate content in when chapter loads
  useEffect(() => {
    if (chapter && !isLoading) {
      setIsVisible(false);
      // Small delay for smooth transition
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [chapter, isLoading]);

  // Restore scroll position when chapter loads with saved position
  useEffect(() => {
    if (initialScrollPosition && chapter && initialScrollPosition > 0 && !hasRestoredScroll.current && !isLoading) {
      // Mark as restored immediately to prevent multiple restoration attempts
      hasRestoredScroll.current = true;

      // Clear any existing timeouts
      restoreTimeouts.current.forEach(clearTimeout);
      restoreTimeouts.current = [];

      // Wait for content to be fully rendered before scrolling
      const restoreScroll = () => {
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        const trackLength = documentHeight - windowHeight;

        if (trackLength > 0) {
          const scrollTop = (initialScrollPosition / 100) * trackLength;
          window.scrollTo({ top: scrollTop, behavior: 'instant' });
        }
      };

      // Try restoring with delays
      restoreTimeouts.current = [
        setTimeout(restoreScroll, 100),
        setTimeout(restoreScroll, 300),
      ];
    }

    return () => {
      restoreTimeouts.current.forEach(clearTimeout);
    };
  }, [chapter, initialScrollPosition, isLoading]);

  // Reset restoration flag when chapter changes
  useEffect(() => {
    hasRestoredScroll.current = false;
  }, [chapter]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const trackLength = documentHeight - windowHeight;
      const progress = Math.min((scrollTop / trackLength) * 100, 100);

      setScrollProgress(progress);

      // Notify parent of scroll position change
      if (onScrollChange) {
        onScrollChange(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [onScrollChange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="space-y-2 text-center">
          <div className="w-1 h-8 bg-foreground/20 animate-pulse mx-auto" />
          <p className="text-sm text-muted-foreground">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Chapter not found</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-24 bg-[hsl(var(--reader-bg))]">
      {/* Reading content */}
      <article
        ref={contentRef}
        className={`reader-content max-w-[42rem] mx-auto px-6 sm:px-8 md:px-12 pt-24 pb-16 transition-opacity duration-500 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Chapter title */}
        {chapter.title && (
          <header className="mb-12 animate-fade-in">
            {/* Decorative ornament */}
            <div className="flex items-center justify-center mb-6">
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-semibold mb-4 text-center tracking-tight leading-tight text-[hsl(var(--reader-text))]">
              {chapter.title}
            </h1>

            {/* Decorative ornament */}
            <div className="flex items-center justify-center mt-6">
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
            </div>
          </header>
        )}

        {/* Chapter content */}
        <div className="space-y-6">
          {chapter.paragraphs?.map((paragraph: any, index: number) => (
            <p
              key={index}
              className={`hyphenate text-[hsl(var(--reader-text))] animate-fade-in-stagger ${
                index === 0 && chapter.title ? 'drop-cap mt-8' : ''
              }`}
              style={{
                animationDelay: `${Math.min(index * 50, 400)}ms`,
              }}
              lang="en"
            >
              {fixEncodingIssues(paragraph.text)}
            </p>
          ))}
        </div>

        {/* End of chapter ornament */}
        <div className="flex items-center justify-center mt-16 mb-8 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
        </div>
      </article>
    </main>
  );
}
