'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { useBooks } from '@/lib/hooks/use-books';
import { BookCard } from '@/components/library/book-card';
import { UploadingBookCard } from '@/components/library/uploading-book-card';
import { UploadButton } from '@/components/library/upload-button';
import { Bookshelf } from '@/components/library/bookshelf';
import { Select } from '@base-ui/react/select';
import { Settings, BookOpen, Search, X, ChevronDown, Check } from 'lucide-react';

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
  const { books, isLoading: booksLoading, uploadingBooks, dismissUploadError, uploadBooks } = useBooks();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'added' | 'title' | 'author'>('added');
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  // Filter and sort books
  const filteredBooks = useMemo(() => {
    let result = searchQuery.trim()
      ? books.filter(book => smartMatch(book, searchQuery))
      : [...books];

    // Sort books
    result.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          // Recently opened first (books never opened go to the end)
          const aRead = a.lastReadAt ? new Date(a.lastReadAt).getTime() : 0;
          const bRead = b.lastReadAt ? new Date(b.lastReadAt).getTime() : 0;
          return bRead - aRead;
        case 'added':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'author':
          return (a.author || '').localeCompare(b.author || '');
        default:
          return 0;
      }
    });

    return result;
  }, [books, searchQuery, sortBy]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    const epubFiles = files.filter(file =>
      file.name.toLowerCase().endsWith('.epub')
    );

    if (epubFiles.length === 0) {
      if (files.length > 0) {
        alert('Please drop EPUB files only');
      }
      return;
    }

    const nonEpubCount = files.length - epubFiles.length;
    if (nonEpubCount > 0) {
      alert(`${nonEpubCount} non-EPUB file(s) were skipped`);
    }

    try {
      await uploadBooks(epubFiles);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [uploadBooks]);

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
    <div
      className="min-h-screen relative"
      style={{ background: 'url(/wood.png) repeat' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-black/40 pointer-events-none">
          <div className="absolute inset-4 border-2 border-white/30 rounded-xl flex items-center justify-center">
            <p className="text-white/90 text-lg font-medium">Drop EPUB files</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-gradient-to-b from-black/40 to-transparent backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-center gap-2">
          {/* Search and sort */}
          {books.length > 0 && (
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="text"
                  placeholder="Search books..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-8 rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Select.Root
                value={sortBy}
                onValueChange={(value) => value && setSortBy(value as any)}
              >
                <Select.Trigger className="flex items-center gap-2 h-10 px-4 rounded-lg bg-white/10 border border-white/10 text-white text-sm hover:bg-white/15 transition-colors cursor-pointer shrink-0">
                  <Select.Value />
                  <Select.Icon>
                    <ChevronDown className="w-4 h-4 text-white/60" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={4} className="z-50">
                    <Select.Popup className="min-w-[140px] rounded-lg border border-white/10 bg-stone-800 p-1 shadow-xl">
                      {[
                        { value: 'added', label: 'Date added' },
                        { value: 'recent', label: 'Recently read' },
                        { value: 'title', label: 'Title' },
                        { value: 'author', label: 'Author' },
                      ].map((option) => (
                        <Select.Item
                          key={option.value}
                          value={option.value}
                          className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer outline-none text-sm text-white/90 data-[highlighted]:bg-white/10 transition-colors"
                        >
                          <Select.ItemText>{option.label}</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check className="w-4 h-4 text-amber-400" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <UploadButton variant="shelf" />
            <button
              onClick={() => router.push('/settings')}
              className="h-10 w-10 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="h-10 px-4 rounded-lg text-white/80 hover:text-white hover:bg-white/10 text-sm transition-colors hidden sm:flex items-center"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {allItems.length === 0 && searchQuery ? (
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
                Drag and drop EPUBs here, or click to upload
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
