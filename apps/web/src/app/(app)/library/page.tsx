'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { useBooks } from '@/lib/hooks/use-books';
import { BookCard } from '@/components/library/book-card';
import { UploadingBookCard } from '@/components/library/uploading-book-card';
import { UploadButton } from '@/components/library/upload-button';
import { Bookshelf } from '@/components/library/bookshelf';
import { Select } from '@base-ui/react/select';
import { Slider } from '@base-ui/react/slider';
import { Settings, Search, X, ChevronDown, Check, Star, WifiOff } from 'lucide-react';

function BookScaleSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const handlePointerUp = () => setIsActive(false);
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [isActive]);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl">
      <svg className="w-3.5 h-3.5 text-white/50" viewBox="0 0 24 24" fill="currentColor">
        <rect x="8.5" y="7" width="7" height="10" rx="1" />
      </svg>
      <Slider.Root
        value={value}
        onValueChange={(val) => {
          const num = Array.isArray(val) ? val[0] : val;
          if (typeof num === 'number' && !isNaN(num)) {
            onChange(num);
          }
        }}
        min={0.7}
        max={1.2}
        step={0.05}
        className="relative flex items-center w-32 h-5 touch-none select-none"
      >
        <Slider.Control
          className="group/slider flex items-center w-full py-2 -my-2 cursor-pointer"
          onPointerDown={() => setIsActive(true)}
        >
          <Slider.Track className="relative h-1 w-full rounded-full bg-white/20">
            <Slider.Indicator className="absolute h-full rounded-full bg-white/50" />
            <Slider.Thumb
              className={`block w-4 h-4 rounded-full bg-white shadow-lg shadow-black/30 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-150 ease-out cursor-grab active:cursor-grabbing ${
                isActive ? 'scale-150' : 'group-hover/slider:scale-150'
              }`}
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <svg className="w-5 h-5 text-white/50" viewBox="0 0 24 24" fill="currentColor">
        <rect x="7.5" y="5.5" width="9" height="13" rx="1" />
      </svg>
    </div>
  );
}

function smartMatch(book: any, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  const title = (book.title || '').toLowerCase();
  const author = (book.author || '').toLowerCase();
  const queryWords = q.split(/\s+/).filter(Boolean);

  return queryWords.every((word) => {
    if (title.includes(word) || author.includes(word)) return true;

    // Abbreviation expansions: "vol" -> "volume", "pt" -> "part", etc.
    const expansions: Record<string, string[]> = {
      vol: ['volume'],
      pt: ['part'],
      ch: ['chapter'],
      bk: ['book'],
      ed: ['edition', 'edited'],
      dr: ['doctor'],
      mr: ['mister'],
      mrs: ['missus'],
      st: ['saint'],
    };

    const expanded = expansions[word];
    if (expanded) {
      return expanded.some((exp) => title.includes(exp) || author.includes(exp));
    }

    return false;
  });
}

export default function LibraryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const {
    books,
    isLoading: booksLoading,
    isOfflineMode,
    uploadingBooks,
    dismissUploadError,
    uploadBooks,
  } = useBooks();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'added' | 'title' | 'author'>(() => {
    if (typeof window === 'undefined') return 'added';
    const saved = localStorage.getItem('library_sort');
    return (saved as 'recent' | 'added' | 'title' | 'author') || 'added';
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [bookScale, setBookScale] = useState(1);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem('library_book_scale');
    if (saved) {
      setBookScale(parseFloat(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('library_sort', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('library_book_scale', bookScale.toString());
  }, [bookScale]);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          if (currentScrollY < 50) {
            setIsHeaderVisible(true);
          } else if (currentScrollY < lastScrollY.current - 5) {
            setIsHeaderVisible(true);
          } else if (currentScrollY > lastScrollY.current + 5 && currentScrollY > 100) {
            setIsHeaderVisible(false);
          }

          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredBooks = useMemo(() => {
    let result = searchQuery.trim()
      ? books.filter((book) => smartMatch(book, searchQuery))
      : [...books];

    if (showFavoritesOnly) {
      result = result.filter((book) => book.isFavorite);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
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
  }, [books, searchQuery, sortBy, showFavoritesOnly]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isOfflineMode) return; // Disable drag when offline
      setDragCounter((prev) => prev + 1);
      if (e.dataTransfer.types.includes('Files')) {
        setIsDragging(true);
      }
    },
    [isOfflineMode]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
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

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      const files = Array.from(e.dataTransfer.files);
      const epubFiles = files.filter((file) => file.name.toLowerCase().endsWith('.epub'));

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
    },
    [uploadBooks]
  );

  const allItems = useMemo(() => {
    const items: React.ReactNode[] = [];

    if (!searchQuery.trim()) {
      uploadingBooks.forEach((upload) => {
        items.push(
          <UploadingBookCard key={upload.id} upload={upload} onDismiss={dismissUploadError} />
        );
      });
    }

    filteredBooks.forEach((book) => {
      items.push(<BookCard key={book.id} book={book} />);
    });

    return items;
  }, [filteredBooks, uploadingBooks, dismissUploadError, searchQuery]);

  if (authLoading || booksLoading) {
    return (
      <div
        className="min-h-screen pt-20"
        style={{
          backgroundColor: '#1a1410',
          backgroundImage: 'url(/wood.png)',
          backgroundRepeat: 'repeat',
          ['--book-scale' as string]: bookScale,
        }}
      >
        <Bookshelf scale={bookScale}>{[]}</Bookshelf>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundColor: '#1a1410',
        backgroundImage: 'url(/wood.png)',
        backgroundRepeat: 'repeat',
        ['--book-scale' as string]: bookScale,
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-black/40 pointer-events-none">
          <div className="absolute inset-4 border-2 border-white/30 rounded-xl flex items-center justify-center">
            <p className="text-white/90 text-lg font-medium">Drop EPUB files</p>
          </div>
        </div>
      )}

      <header
        className={`fixed top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 via-black/40 to-transparent backdrop-blur-xl border-b border-white/5 transition-all duration-300 ease-out ${
          isHeaderVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-[1.5rem] md:px-[3rem] py-4">
          <div className="flex items-center justify-between gap-4">
            {books.length > 0 && (
              <div className="flex items-center gap-3 flex-1 max-w-2xl">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40" />
                  <input
                    type="text"
                    placeholder="Search books..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-11 pl-11 pr-10 rounded-full bg-white/5 text-white placeholder:text-white/40 text-sm focus:outline-none focus:bg-white/10 transition-all duration-300 border border-white/0 focus:border-white/10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white/80 transition-all duration-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={`flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 shrink-0 ${
                    showFavoritesOnly
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 border border-white/0 hover:border-white/10'
                  }`}
                  title={showFavoritesOnly ? 'Show all books' : 'Show favorites only'}
                >
                  <Star
                    className={`w-[18px] h-[18px] ${showFavoritesOnly ? 'fill-current' : ''}`}
                  />
                </button>
                <Select.Root
                  value={sortBy}
                  onValueChange={(value) => value && setSortBy(value as any)}
                >
                  <Select.Trigger className="flex items-center gap-2 h-11 px-4 rounded-full bg-white/5 hover:bg-white/10 text-white/90 text-sm transition-all duration-300 cursor-pointer shrink-0 border border-white/0 hover:border-white/10 capitalize">
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown className="w-4 h-4 text-white/50" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner sideOffset={4} className="z-50">
                      <Select.Popup className="min-w-[160px] rounded-2xl border border-white/10 bg-black/95 backdrop-blur-xl p-2 shadow-2xl">
                        {[
                          { value: 'added', label: 'Date added' },
                          { value: 'recent', label: 'Recently read' },
                          { value: 'title', label: 'Title' },
                          { value: 'author', label: 'Author' },
                        ].map((option) => (
                          <Select.Item
                            key={option.value}
                            value={option.value}
                            className="flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer outline-none text-sm text-white/90 data-[highlighted]:bg-white/10 transition-all duration-200"
                          >
                            <Select.ItemText>{option.label}</Select.ItemText>
                            <Select.ItemIndicator>
                              <Check className="w-4 h-4 text-white/90" />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              </div>
            )}

            <div className="flex items-center gap-3 shrink-0">
              {!isOfflineMode && <UploadButton variant="shelf" />}
              <button
                onClick={() => router.push('/settings')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <Settings className="w-[18px] h-[18px]" />
              </button>
              <button
                onClick={logout}
                className="h-10 px-5 rounded-full bg-white/5 hover:bg-white/10 text-white/90 text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 hidden sm:flex items-center"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Offline Mode Banner */}
      {isOfflineMode && (
        <div
          className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ease-out ${
            isHeaderVisible ? 'translate-y-[72px]' : 'translate-y-0'
          }`}
        >
          <div className="bg-amber-500/90 backdrop-blur-sm border-b border-amber-600/50">
            <div className="max-w-[1400px] mx-auto px-[1.5rem] md:px-[3rem] py-2.5">
              <div className="flex items-center justify-center gap-2 text-sm text-amber-950">
                <WifiOff className="w-4 h-4" />
                <span className="font-medium">Offline mode</span>
                <span className="text-amber-900">— Showing downloaded books</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        className={`pt-20 ${isOfflineMode ? 'mt-10' : ''}`}
        style={{ ['--book-scale' as string]: bookScale }}
      >
        {allItems.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 max-w-md">
              <Search className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <p className="text-xl text-white/90 mb-2">No books found</p>
              <p className="text-white/60 mb-6">No matches for "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="h-11 px-6 rounded-full bg-white/5 hover:bg-white/10 text-white/90 text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95"
              >
                Clear search
              </button>
            </div>
          </div>
        ) : allItems.length === 0 ? (
          <div className="relative">
            {/* Empty shelves */}
            <Bookshelf scale={bookScale}>{[]}</Bookshelf>

            {/* Floating prompt */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto text-center">
                {isOfflineMode ? (
                  <>
                    <WifiOff className="w-8 h-8 text-white/40 mx-auto mb-3" />
                    <p className="text-white/70 text-sm mb-1">No downloaded books</p>
                    <p className="text-white/50 text-xs">
                      Connect to the internet to access your library
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-white/70 text-sm mb-3">Drop EPUBs here to get started</p>
                    <UploadButton variant="shelf" size="sm" />
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Search results indicator */}
            {searchQuery && (
              <div className="container mx-auto px-4 py-3">
                <p className="text-white/60 text-sm">
                  {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'} matching "
                  {searchQuery}"
                </p>
              </div>
            )}
            <Bookshelf scale={bookScale}>{allItems}</Bookshelf>
          </>
        )}
      </main>

      {/* Floating scale slider - Mac OS X style */}
      {books.length > 0 && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ease-out ${
            isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
          }`}
        >
          <BookScaleSlider value={bookScale} onChange={setBookScale} />
        </div>
      )}
    </div>
  );
}
