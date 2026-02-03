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

  useEffect(() => {
    if (chapter && !isLoading) {
      setIsVisible(false);
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [chapter, isLoading]);

  useEffect(() => {
    if (
      initialScrollPosition &&
      chapter &&
      initialScrollPosition > 0 &&
      !hasRestoredScroll.current &&
      !isLoading
    ) {
      hasRestoredScroll.current = true;

      restoreTimeouts.current.forEach(clearTimeout);
      restoreTimeouts.current = [];

      const restoreScroll = () => {
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        const trackLength = documentHeight - windowHeight;

        if (trackLength > 0) {
          const scrollTop = (initialScrollPosition / 100) * trackLength;
          window.scrollTo({ top: scrollTop, behavior: 'instant' });
        }
      };

      restoreTimeouts.current = [setTimeout(restoreScroll, 100), setTimeout(restoreScroll, 300)];
    }

    return () => {
      restoreTimeouts.current.forEach(clearTimeout);
    };
  }, [chapter, initialScrollPosition, isLoading]);

  useEffect(() => {
    hasRestoredScroll.current = false;
  }, [chapter]);

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const trackLength = documentHeight - windowHeight;
      const progress = Math.min((scrollTop / trackLength) * 100, 100);

      setScrollProgress(progress);

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
        <svg
          className="animate-spin h-6 w-6 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
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
      <article
        ref={contentRef}
        className={`reader-content max-w-[42rem] mx-auto px-6 sm:px-8 md:px-12 pt-24 pb-16 transition-opacity duration-500 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {chapter.title && (
          <header className="mb-12 animate-fade-in">
            <div className="flex items-center justify-center mb-6">
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-semibold mb-4 text-center tracking-tight leading-tight text-[hsl(var(--reader-text))]">
              {chapter.title}
            </h1>

            <div className="flex items-center justify-center mt-6">
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
            </div>
          </header>
        )}

        <div className="space-y-6">
          {chapter.paragraphs?.map((paragraph: any, index: number) => (
            <p
              key={index}
              className={`hyphenate text-[hsl(var(--reader-text))] animate-fade-in-stagger whitespace-pre-line ${
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

        <div
          className="flex items-center justify-center mt-16 mb-8 animate-fade-in"
          style={{ animationDelay: '600ms' }}
        >
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
        </div>
      </article>
    </main>
  );
}
