'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { useBooks } from '@/lib/hooks/use-books';
import { Button } from '@/components/ui/button';
import { BookCard } from '@/components/library/book-card';
import { UploadingBookCard } from '@/components/library/uploading-book-card';
import { UploadButton } from '@/components/library/upload-button';
import { Bookshelf } from '@/components/library/bookshelf';
import { Settings, BookOpen, Search, X } from 'lucide-react';

// Smart search that matches title, author, and handles common variations
function smartMatch(book: any, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  const title = (book.title || '').toLowerCase();
  const author = (book.author || '').toLowerCase();

  // Split query into words for multi-term matching
  const queryWords = q.split(/\s+/).filter(Boolean);

  // Check if all query words match somewhere in title or author
  return queryWords.every(word => {
    // Direct match
    if (title.includes(word) || author.includes(word)) return true;

    // Handle common abbreviations and variations
    // "vol" matches "volume", "pt" matches "part", etc.
    const expansions: Record<string, string[]> = {
      'vol': ['volume'],
      'pt': ['part'],
      'ch': ['chapter'],
      'bk': ['book'],
      'ed': ['edition', 'edited'],
      'dr': ['doctor'],
      'mr': ['mister'],
      'mrs': ['missus'],
      'st': ['saint'],
    };

    const expanded = expansions[word];
    if (expanded) {
      return expanded.some(exp => title.includes(exp) || author.includes(exp));
    }

    return false;
  });
}

export default function LibraryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const { books, isLoading: booksLoading, uploadingBooks, dismissUploadError } = useBooks();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books;
    return books.filter(book => smartMatch(book, searchQuery));
  }, [books, searchQuery]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Combine uploading and filtered books
  const allItems = useMemo(() => {
    const items: React.ReactNode[] = [];

    // Add uploading books first (only when not searching)
    if (!searchQuery.trim()) {
      uploadingBooks.forEach((upload) => {
        items.push(
          <UploadingBookCard
            key={upload.id}
            upload={upload}
            onDismiss={dismissUploadError}
          />
        );
      });
    }

    // Add filtered books
    filteredBooks.forEach((book) => {
      items.push(<BookCard key={book.id} book={book} />);
    });

    return items;
  }, [filteredBooks, uploadingBooks, dismissUploadError, searchQuery]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'url(/wood.png) repeat' }}>
        <p className="text-white/80 text-lg">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: 'url(/wood.png) repeat' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gradient-to-b from-black/40 to-transparent backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <BookOpen className="w-5 h-5 text-amber-200" />
            <h1 className="text-lg font-semibold text-white drop-shadow-lg hidden sm:block">Chapter</h1>
          </div>

          {/* Search bar */}
          {books.length > 0 && (
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="text"
                  placeholder="Search books..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <UploadButton variant="shelf" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/settings')}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white/80 hover:text-white hover:bg-white/10 hidden sm:flex"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {booksLoading && uploadingBooks.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-white/60 text-lg">Loading your library...</p>
          </div>
        ) : allItems.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 max-w-md">
              <Search className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <p className="text-xl text-white/90 mb-2">
                No books found
              </p>
              <p className="text-white/60 mb-4">
                No matches for "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-amber-300 hover:text-amber-200 text-sm font-medium transition-colors"
              >
                Clear search
              </button>
            </div>
          </div>
        ) : allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 max-w-md">
              <BookOpen className="w-16 h-16 text-amber-200/60 mx-auto mb-4" />
              <p className="text-xl text-white/90 mb-2">
                Your library is empty
              </p>
              <p className="text-white/60 mb-6">
                Upload an EPUB to fill your shelves
              </p>
              <UploadButton variant="shelf" size="lg" />
            </div>
          </div>
        ) : (
          <>
            {/* Search results indicator */}
            {searchQuery && (
              <div className="container mx-auto px-4 py-3">
                <p className="text-white/60 text-sm">
                  {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'} matching "{searchQuery}"
                </p>
              </div>
            )}
            <Bookshelf>
              {allItems}
            </Bookshelf>
          </>
        )}
      </main>
    </div>
  );
}
