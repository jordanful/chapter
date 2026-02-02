'use client';

import { ReactNode, useMemo, Children, useState, useEffect } from 'react';

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

export function Bookshelf({ children }: BookshelfProps) {
  const booksPerShelf = useBooksPerShelf();

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

  return (
    <div className="bookshelf-container">
      {shelves.map((shelfBooks, index) => (
        <div key={index} className="shelf">
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
      ))}
    </div>
  );
}
