'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { fixEncodingIssues } from '@/lib/text-cleanup';

interface ReadAlongViewProps {
  chapter: any;
  currentWordIndex?: number | null; // null or undefined = no highlighting
  isLoading: boolean;
  onScrollProgress?: (percentage: number) => void;
  enableAutoScroll?: boolean; // Auto-scroll to highlighted word
}

export function ReadAlongView({
  chapter,
  currentWordIndex = null,
  isLoading,
  onScrollProgress,
  enableAutoScroll = false,
}: ReadAlongViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const highlightedWordRef = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const isHighlighting = currentWordIndex !== null && currentWordIndex !== undefined;

  // Track scroll progress
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

  // Animate content in when chapter loads
  useEffect(() => {
    if (chapter && !isLoading) {
      setIsVisible(false);
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [chapter, isLoading]);

  // Auto-scroll to keep highlighted word in view (accounting for audio player)
  useEffect(() => {
    if (!enableAutoScroll || !highlightedWordRef.current) return;

    const element = highlightedWordRef.current;
    const rect = element.getBoundingClientRect();
    const audioPlayerHeight = 140; // Height of fixed audio player at bottom
    const topPadding = 100; // Space from top of viewport

    // Calculate visible area (viewport minus audio player)
    const visibleTop = topPadding;
    const visibleBottom = window.innerHeight - audioPlayerHeight;

    // Check if word is outside the safe visible area
    if (rect.top < visibleTop || rect.bottom > visibleBottom) {
      // Calculate scroll position to center word in the safe area
      const safeAreaCenter = visibleTop + (visibleBottom - visibleTop) / 2;
      const scrollTarget = window.scrollY + rect.top - safeAreaCenter;

      window.scrollTo({
        top: Math.max(0, scrollTarget),
        behavior: 'smooth',
      });
    }
  }, [currentWordIndex, enableAutoScroll]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin h-6 w-6 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
        {/* Chapter title */}
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

        {/* Chapter content with word highlighting */}
        <div className="space-y-6">
          {chapter.paragraphs?.map((paragraph: any, pIndex: number) => {
            const cleanedText = fixEncodingIssues(paragraph.text);
            const words = cleanedText.split(/(\s+)/);

            // Calculate paragraph start index by summing previous paragraphs + separators
            const paragraphStartIndex = chapter.paragraphs
              .slice(0, pIndex)
              .reduce((sum: number, p: any, idx: number) => {
                const pWords = p.text.split(/(\s+)/).length;
                // Add 1 for the \n\n separator after each paragraph (except the last)
                return sum + pWords + 1; // +1 for separator
              }, 0);

            return (
              <p
                key={pIndex}
                className={`hyphenate text-[hsl(var(--reader-text))] animate-fade-in-stagger ${
                  pIndex === 0 && chapter.title ? 'drop-cap mt-8' : ''
                }`}
                style={{
                  animationDelay: `${Math.min(pIndex * 50, 400)}ms`,
                }}
                lang="en"
              >
                {words.map((word: string, wIndex: number) => {
                  const globalWordIndex = paragraphStartIndex + wIndex;
                  const isWordHighlighted = isHighlighting && globalWordIndex === currentWordIndex;
                  const isWhitespace = /^\s+$/.test(word);

                  if (isWhitespace) {
                    return <span key={wIndex}>{word}</span>;
                  }

                  return (
                    <span
                      key={wIndex}
                      ref={isWordHighlighted ? highlightedWordRef : null}
                      className={isWordHighlighted ? 'text-[hsl(var(--reader-accent))] relative inline-block' : ''}
                      style={
                        isWordHighlighted
                          ? {
                              textShadow: '0 0 12px hsla(var(--reader-accent-rgb), 0.3)',
                              background: 'linear-gradient(to bottom, transparent 0%, hsla(var(--reader-accent-rgb), 0.15) 0%, hsla(var(--reader-accent-rgb), 0.15) 100%, transparent 100%)',
                              backgroundSize: '100% 100%',
                              borderRadius: '2px',
                            }
                          : undefined
                      }
                    >
                      {word}
                    </span>
                  );
                })}
              </p>
            );
          })}
        </div>

        {/* End of chapter ornament */}
        <div className="flex items-center justify-center mt-16 mb-8 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
        </div>
      </article>
    </main>
  );
}
