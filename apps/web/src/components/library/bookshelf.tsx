'use client';

import { ReactNode, useMemo, Children, useState, useEffect, useRef } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

interface BookshelfProps {
  children: ReactNode;
  scale?: number;
}

// Returns books per shelf based on screen width and scale
// Only changes at discrete thresholds for smooth visual experience
function useBooksPerShelf(scale: number) {
  const [booksPerShelf, setBooksPerShelf] = useState(6);

  useEffect(() => {
    function calculateBooks() {
      const width = window.innerWidth;

      // Base books per shelf at different breakpoints (at scale 1.0)
      let baseBooks: number;
      if (width <= 480) {
        baseBooks = 2;
      } else if (width <= 768) {
        baseBooks = 3;
      } else if (width <= 1024) {
        baseBooks = 4;
      } else if (width <= 1400) {
        baseBooks = 5;
      } else {
        baseBooks = 6;
      }

      // Only change columns at discrete scale thresholds (0.7, 0.85, 1.0, 1.1, 1.2)
      // This prevents jitter from continuous scale changes
      let columnMultiplier: number;
      if (scale <= 0.75) {
        columnMultiplier = 1.4; // More columns when small
      } else if (scale <= 0.9) {
        columnMultiplier = 1.2;
      } else if (scale <= 1.05) {
        columnMultiplier = 1.0; // Base columns
      } else {
        columnMultiplier = 0.8; // Fewer columns when large
      }

      const adjustedBooks = Math.round(baseBooks * columnMultiplier);
      return Math.max(2, Math.min(10, adjustedBooks));
    }

    setBooksPerShelf(calculateBooks());

    function handleResize() {
      setBooksPerShelf(calculateBooks());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [scale]);

  return booksPerShelf;
}

// Base shelf height for virtualization (book + shelf board + padding)
const BASE_SHELF_HEIGHT = 320;

export function Bookshelf({ children, scale = 1 }: BookshelfProps) {
  const shelfHeight = BASE_SHELF_HEIGHT * scale;
  const booksPerShelf = useBooksPerShelf(scale);
  const listRef = useRef<HTMLDivElement>(null);

  const shelves = useMemo(() => {
    const items = Children.toArray(children);
    const result: ReactNode[][] = [];

    // Chunk books into shelves based on current screen size
    for (let i = 0; i < items.length; i += booksPerShelf) {
      result.push(items.slice(i, i + booksPerShelf));
    }

    // Always show a minimum number of shelves for visual consistency
    const minShelves = 3;
    while (result.length < minShelves) {
      result.push([]);
    }

    return result;
  }, [children, booksPerShelf]);

  const virtualizer = useWindowVirtualizer({
    count: shelves.length,
    estimateSize: () => shelfHeight,
    overscan: 2, // Render 2 extra shelves above/below viewport for smooth scrolling
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={listRef}
      className="bookshelf-container"
      style={{
        ['--book-scale' as string]: scale,
        ['--books-per-shelf' as string]: booksPerShelf,
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const shelfBooks = shelves[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="shelf"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              <div className="shelf-books">
                {shelfBooks.map((book, bookIndex) => (
                  <div key={bookIndex} className="shelf-book">
                    {book}
                  </div>
                ))}
              </div>
              <div className="shelf-board">
                <div className="shelf-edge" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
