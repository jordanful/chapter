'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from '@base-ui/react/menu';
import { Tooltip } from '@base-ui/react/tooltip';
import { apiClient } from '@/lib/api-client';
import { offlineStorage } from '@/lib/offline-storage';
import {
  Download,
  Check,
  Loader2,
  MoreHorizontal,
  ImageIcon,
  BookOpen,
  Edit,
  Star,
} from 'lucide-react';

// Tailwind safelist: These classes must be statically present for JIT to include them
// prettier-ignore
const BOOK_COLORS = [
  'from-rose-800 to-rose-950',     // bg-gradient-to-br from-rose-800 to-rose-950
  'from-amber-800 to-amber-950',   // bg-gradient-to-br from-amber-800 to-amber-950
  'from-emerald-800 to-emerald-950', // bg-gradient-to-br from-emerald-800 to-emerald-950
  'from-blue-800 to-blue-950',     // bg-gradient-to-br from-blue-800 to-blue-950
  'from-violet-800 to-violet-950', // bg-gradient-to-br from-violet-800 to-violet-950
  'from-slate-700 to-slate-900',   // bg-gradient-to-br from-slate-700 to-slate-900
  'from-orange-800 to-orange-950', // bg-gradient-to-br from-orange-800 to-orange-950
  'from-teal-800 to-teal-950',     // bg-gradient-to-br from-teal-800 to-teal-950
  'from-indigo-800 to-indigo-950', // bg-gradient-to-br from-indigo-800 to-indigo-950
  'from-stone-700 to-stone-900',   // bg-gradient-to-br from-stone-700 to-stone-900
] as const;

// Generate a consistent color based on the book title
function getBookColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash = hash & hash;
  }

  return BOOK_COLORS[Math.abs(hash) % BOOK_COLORS.length];
}
import { useDownload } from '@/lib/hooks/use-download';
import { useBooks } from '@/lib/hooks/use-books';
import { CoverPickerDialog } from './cover-picker-dialog';
import { MetadataEditorModal } from '../books/metadata-editor-modal';
import { useQueryClient } from '@tanstack/react-query';

interface BookCardProps {
  book: any;
}

export function BookCard({ book }: BookCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toggleFavorite } = useBooks();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const { downloadBook, isDownloading, progress } = useDownload();

  const loadCover = useCallback(
    async (forceReload = false) => {
      const bookId = book.id;
      const coverPath = book.coverPath;

      try {
        const offlineCover = await offlineStorage.getCover(bookId);
        if (offlineCover) {
          const url = URL.createObjectURL(offlineCover);
          setCoverUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          return;
        }

        if (coverPath) {
          const blob = await apiClient.getCover(bookId);
          const url = URL.createObjectURL(blob);
          setCoverUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        } else if (forceReload) {
          setCoverUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }
      } catch (error) {
        console.error('Failed to load cover for book:', bookId, error);
      }
    },
    [book.id, book.coverPath]
  );

  const checkDownloaded = useCallback(async () => {
    const downloaded = await offlineStorage.isBookDownloaded(book.id);
    setIsDownloaded(downloaded);
  }, [book.id]);

  // Initial load
  useEffect(() => {
    loadCover(false);
    checkDownloaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id]); // Only reload when book.id changes

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      setCoverUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDownloaded && !isDownloading) {
      try {
        await downloadBook(book.id);
        setIsDownloaded(true);
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTogglingFavorite) return;

    setIsTogglingFavorite(true);
    try {
      await toggleFavorite(book.id, !book.isFavorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleSaveMetadata = useCallback(
    async (metadata: any) => {
      const bookId = book.id;
      console.log('Saving metadata for book:', bookId, metadata);
      await apiClient.updateBookMetadata(bookId, metadata);
      // Wait for the books query to refetch so we have fresh data
      await queryClient.refetchQueries({ queryKey: ['books'] });
      // Force reload cover since it may have been updated
      loadCover(true);
    },
    [book.id, queryClient, loadCover]
  );

  return (
    <div className="group w-full">
      <div
        className="cursor-pointer relative w-full"
        onClick={() => router.push(`/reader/${book.id}`)}
      >
        {/* Book Cover */}
        <div className="w-full aspect-[2/3] bg-stone-800 overflow-hidden relative book-cover">
          {/* Spine shadow overlay */}
          <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 via-black/20 to-transparent z-10 pointer-events-none" />

          {/* Page edge effect on right side */}
          <div className="absolute inset-y-1 right-0 w-1 bg-gradient-to-l from-stone-300 to-stone-100 z-10 pointer-events-none rounded-r-sm" />

          {coverUrl ? (
            <img
              src={coverUrl}
              alt={book.title}
              className="w-full h-full object-cover"
              onError={() => setCoverUrl(null)}
            />
          ) : (
            <div
              className={`w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br ${getBookColor(book.title)}`}
            >
              {/* Decorative top border */}
              <div className="absolute top-3 left-4 right-4 h-px bg-white/20" />
              <div className="absolute top-4 left-4 right-4 h-px bg-white/10" />

              {/* Book icon */}
              <BookOpen className="w-6 h-6 text-white/30 mb-3" />

              {/* Title */}
              <h3 className="text-white font-serif text-sm font-semibold text-center leading-tight line-clamp-4 px-1">
                {book.title}
              </h3>

              {/* Author */}
              {book.author && (
                <p className="text-white/60 text-xs text-center mt-2 line-clamp-2">{book.author}</p>
              )}

              {/* Decorative bottom border */}
              <div className="absolute bottom-4 left-4 right-4 h-px bg-white/10" />
              <div className="absolute bottom-3 left-4 right-4 h-px bg-white/20" />
            </div>
          )}

          {/* Progress bar - always visible when there's progress */}
          {book.progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40 z-30">
              <div
                className="h-full bg-white transition-all duration-500"
                style={{ width: `${book.progress}%` }}
              />
            </div>
          )}

          {/* Persistent badges - always visible when active */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-20">
            {/* Favorite badge - always visible when favorited */}
            {book.isFavorite && (
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
                <Star className="w-3 h-3 text-white fill-current" />
              </div>
            )}
            {/* Downloaded badge - always visible when downloaded */}
            {isDownloaded && (
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
              </div>
            )}
          </div>

          {/* Hover overlay - subtle gradient at bottom only */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />

          {/* Book info on hover - bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-3 pb-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
            <h3 className="font-medium text-sm text-white line-clamp-2 leading-snug drop-shadow-lg">
              {book.title}
            </h3>
            {book.author && (
              <p className="text-xs text-white/70 line-clamp-1 mt-1">{book.author}</p>
            )}
            {book.progress > 0 && (
              <p className="text-xs text-white/50 mt-1">{Math.round(book.progress)}%</p>
            )}
          </div>

          {/* Action strip - slides in from right edge on hover */}
          <div className="absolute top-0 bottom-0 right-0 flex items-center">
            <div className="flex flex-col gap-0 bg-black/80 backdrop-blur-md rounded-l-xl py-2 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out shadow-xl">
              {/* Favorite toggle */}
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger
                    className={`flex items-center justify-center w-10 h-10 transition-colors duration-150 ${
                      book.isFavorite
                        ? 'text-amber-400 hover:text-amber-300'
                        : 'text-white/60 hover:text-white'
                    }`}
                    onClick={handleToggleFavorite}
                    disabled={isTogglingFavorite}
                  >
                    <Star className={`w-4 h-4 ${book.isFavorite ? 'fill-current' : ''}`} />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner side="left" sideOffset={8}>
                      <Tooltip.Popup className="rounded-lg bg-black/90 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur-sm">
                        {book.isFavorite ? 'Unfavorite' : 'Favorite'}
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>

              {/* Divider */}
              <div className="w-5 h-px bg-white/10 mx-auto" />

              {/* Edit */}
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger
                    className="flex items-center justify-center w-10 h-10 text-white/60 hover:text-white transition-colors duration-150"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMetadataEditor(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner side="left" sideOffset={8}>
                      <Tooltip.Popup className="rounded-lg bg-black/90 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur-sm">
                        Edit
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>

              {/* Download - only show if not downloaded */}
              {!isDownloaded && (
                <>
                  <div className="w-5 h-px bg-white/10 mx-auto" />
                  <Tooltip.Provider>
                    <Tooltip.Root>
                      <Tooltip.Trigger
                        className="flex items-center justify-center w-10 h-10 text-white/60 hover:text-white transition-colors duration-150"
                        onClick={handleDownload}
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Positioner side="left" sideOffset={8}>
                          <Tooltip.Popup className="rounded-lg bg-black/90 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur-sm">
                            {isDownloading ? 'Downloading...' : 'Download'}
                          </Tooltip.Popup>
                        </Tooltip.Positioner>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </>
              )}
            </div>
          </div>

          {/* Download progress bar */}
          {isDownloading && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30 backdrop-blur-sm">
              <div
                className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Cover Picker Dialog */}
      <CoverPickerDialog
        book={book}
        isOpen={showCoverPicker}
        onClose={() => {
          setShowCoverPicker(false);
          loadCover();
        }}
      />

      {/* Metadata Editor Modal */}
      <MetadataEditorModal
        book={book}
        isOpen={showMetadataEditor}
        onClose={() => setShowMetadataEditor(false)}
        onSave={handleSaveMetadata}
      />
    </div>
  );
}
