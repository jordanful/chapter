'use client';

import { ReactNode, useMemo, Children, useState, useEffect, useRef } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

interface BookshelfProps {
  children: ReactNode;
}

// Returns books per shelf based on screen width (matches CSS grid breakpoints)
function useBooksPerShelf() {
  const [booksPerShelf, setBooksPerShelf] = useState(6);

  useEffect(() => {
    function updateBooksPerShelf() {
      const width = window.innerWidth;
      if (width <= 480) {
        setBooksPerShelf(2);
      } else if (width <= 768) {
        setBooksPerShelf(3);
      } else if (width <= 1024) {
        setBooksPerShelf(4);
      } else if (width <= 1280) {
        setBooksPerShelf(5);
      } else {
        setBooksPerShelf(6);
      }
    }

    updateBooksPerShelf();
    window.addEventListener('resize', updateBooksPerShelf);
    return () => window.removeEventListener('resize', updateBooksPerShelf);
  }, []);

  return booksPerShelf;
}

// Estimated shelf height for virtualization (book + shelf board)
const SHELF_HEIGHT = 280;

export function Bookshelf({ children }: BookshelfProps) {
  const booksPerShelf = useBooksPerShelf();
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
    estimateSize: () => SHELF_HEIGHT,
    overscan: 2, // Render 2 extra shelves above/below viewport for smooth scrolling
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div ref={listRef} className="bookshelf-container">
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
