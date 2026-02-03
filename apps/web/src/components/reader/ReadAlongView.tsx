'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { fixEncodingIssues } from '@/lib/text-cleanup';

interface ReadAlongViewProps {
  chapter: any;
  isLoading: boolean;
  onScrollProgress?: (percentage: number) => void;
}

export function ReadAlongView({ chapter, isLoading, onScrollProgress }: ReadAlongViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = useCallback(() => {
    if (!onScrollProgress) return;
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const scrollable = scrollHeight - clientHeight;
    const percentage = scrollable > 0 ? (scrollTop / scrollable) * 100 : 0;
    onScrollProgress(percentage);
  }, [onScrollProgress]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (chapter && !isLoading) {
      setIsVisible(false);
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [chapter, isLoading]);

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
    <main className="min-h-screen pb-48 bg-[hsl(var(--reader-bg))]">
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
          {chapter.paragraphs?.map((paragraph: any, pIndex: number) => {
            const cleanedText = fixEncodingIssues(paragraph.text);

            return (
              <p
                key={pIndex}
                className={`hyphenate text-[hsl(var(--reader-text))] animate-fade-in-stagger whitespace-pre-line ${
                  pIndex === 0 && chapter.title ? 'drop-cap mt-8' : ''
                }`}
                style={{
                  animationDelay: `${Math.min(pIndex * 50, 400)}ms`,
                }}
                lang="en"
              >
                {cleanedText}
              </p>
            );
          })}
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
