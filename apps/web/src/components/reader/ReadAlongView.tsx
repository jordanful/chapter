'use client';

import { useEffect, useRef, useState } from 'react';
import { fixEncodingIssues } from '@/lib/text-cleanup';

interface ReadAlongViewProps {
  chapter: any;
  currentWordIndex: number;
  isLoading: boolean;
}

export function ReadAlongView({ chapter, currentWordIndex, isLoading }: ReadAlongViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const highlightedWordRef = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Animate content in when chapter loads
  useEffect(() => {
    if (chapter && !isLoading) {
      setIsVisible(false);
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [chapter, isLoading]);

  // Auto-scroll to keep highlighted word in view (smoothly)
  useEffect(() => {
    if (highlightedWordRef.current) {
      highlightedWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentWordIndex]);

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
            const paragraphStartIndex = chapter.paragraphs
              .slice(0, pIndex)
              .reduce((sum: number, p: any) => sum + p.text.split(/(\s+)/).length, 0);

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
                  const isHighlighted = globalWordIndex === currentWordIndex;
                  const isWhitespace = /^\s+$/.test(word);

                  if (isWhitespace) {
                    return <span key={wIndex}>{word}</span>;
                  }

                  return (
                    <span
                      key={wIndex}
                      ref={isHighlighted ? highlightedWordRef : null}
                      className={`transition-all duration-150 ${
                        isHighlighted
                          ? 'bg-[hsl(var(--reader-accent))]/20 text-[hsl(var(--reader-accent))] font-semibold px-1 -mx-1 rounded'
                          : ''
                      }`}
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
