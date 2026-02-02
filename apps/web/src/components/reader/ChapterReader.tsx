'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';

interface ChapterReaderProps {
  chapter: {
    title?: string;
    htmlContent?: string;
    textContent?: string;
    paragraphs?: Array<{ text: string }>;
  } | null;
  isLoading: boolean;
  onScrollProgress?: (percentage: number) => void;
  className?: string;
}

// Detect if a line looks like a header/title
function isHeaderLine(line: string): 'part' | 'chapter' | 'section' | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) return null;

  // Part headers: "PART ONE", "Part 1", "PART I", etc.
  if (/^part\s+(\d+|[ivxlc]+|one|two|three|four|five|six|seven|eight|nine|ten)$/i.test(trimmed)) {
    return 'part';
  }

  // Chapter headers: "Chapter 1", "CHAPTER ONE", "Chapter I"
  if (/^chapter\s+(\d+|[ivxlc]+|one|two|three|four|five|six|seven|eight|nine|ten)$/i.test(trimmed)) {
    return 'chapter';
  }

  // Standalone number or roman numeral or word number (likely chapter number)
  if (/^(\d+|[ivxlc]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)$/i.test(trimmed)) {
    return 'section';
  }

  // All caps short line (likely a title/header)
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && trimmed.length < 40 && /[A-Z]/.test(trimmed)) {
    return 'part';
  }

  return null;
}

// Process text content into structured HTML
function processContent(chapter: ChapterReaderProps['chapter']): string {
  if (!chapter) return '';

  // If we have HTML content with actual tags, use it
  if (chapter.htmlContent && /<(p|div|h[1-6]|br)[>\s/]/i.test(chapter.htmlContent)) {
    return chapter.htmlContent;
  }

  // Otherwise, process from paragraphs or textContent
  let lines: string[] = [];

  if (chapter.paragraphs && chapter.paragraphs.length > 0) {
    lines = chapter.paragraphs.map(p => p.text);
  } else if (chapter.textContent) {
    lines = chapter.textContent.split(/\n\n+/).flatMap(block =>
      block.split(/\n/).filter(line => line.trim())
    );
  } else if (chapter.htmlContent) {
    const text = chapter.htmlContent.replace(/<[^>]+>/g, '\n');
    lines = text.split(/\n+/).filter(line => line.trim());
  }

  if (lines.length === 0) return '';

  const htmlParts: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const headerType = isHeaderLine(line);

    if (headerType === 'part') {
      htmlParts.push(
        `<h2 style="font-size: 0.8125rem; font-weight: 400; text-align: center; text-transform: uppercase; letter-spacing: 0.3em; margin: 3rem 0 0.75rem; opacity: 0.6;">${line}</h2>`
      );
    } else if (headerType === 'chapter') {
      htmlParts.push(
        `<h3 style="font-size: 1.25rem; font-weight: 400; text-align: center; margin: 2.5rem 0 2rem; font-style: italic;">${line}</h3>`
      );
    } else if (headerType === 'section') {
      htmlParts.push(
        `<h4 style="font-size: 1rem; font-weight: 400; text-align: center; margin: 2.5rem 0 1.5rem; opacity: 0.6;">${line}</h4>`
      );
    } else {
      htmlParts.push(`<p>${line}</p>`);
    }
  }

  return htmlParts.join('\n');
}

export function ChapterReader({
  chapter,
  isLoading,
  onScrollProgress,
  className = '',
}: ChapterReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const content = useMemo(() => processContent(chapter), [chapter]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onScrollProgress) return;

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
    window.scrollTo(0, 0);
  }, [chapter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 bg-[hsl(var(--reader-bg))]">
        <svg
          className="animate-spin h-6 w-6 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="flex items-center justify-center py-20 bg-[hsl(var(--reader-bg))]">
        <p className="text-muted-foreground">No content available</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`min-h-screen bg-[hsl(var(--reader-bg))] text-[hsl(var(--reader-text))] ${className}`}
      style={{ fontFamily: 'Bookerly, Georgia, serif' }}
    >
      <article
        className="max-w-xl mx-auto px-6 sm:px-8 py-12 text-[1.125rem] sm:text-[1.1875rem] md:text-[1.25rem] leading-[1.8]
          [&>div>p]:mb-6
          [&>div>p:last-child]:mb-0
          [&>div>blockquote]:border-l-2 [&>div>blockquote]:border-current/20 [&>div>blockquote]:pl-6 [&>div>blockquote]:italic [&>div>blockquote]:my-6"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
