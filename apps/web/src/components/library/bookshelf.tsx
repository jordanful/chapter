'use client';

import { ReactNode, useMemo, Children } from 'react';

interface BookshelfProps {
  children: ReactNode;
}

export function Bookshelf({ children }: BookshelfProps) {
  // Convert children to array and chunk into shelves
  // We use a fixed number for chunking, CSS grid handles actual display
  const booksPerShelf = 6;

  const shelves = useMemo(() => {
    const items = Children.toArray(children);
    const result: ReactNode[][] = [];

    // Chunk books into shelves
    for (let i = 0; i < items.length; i += booksPerShelf) {
      result.push(items.slice(i, i + booksPerShelf));
    }

    // Always show a minimum number of shelves for visual consistency
    const minShelves = 4;
    while (result.length < minShelves) {
      result.push([]);
    }

    return result;
  }, [children]);

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
