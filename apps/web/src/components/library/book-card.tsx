'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from '@base-ui/react/menu';
import { Tooltip } from '@base-ui/react/tooltip';
import { apiClient } from '@/lib/api-client';
import { offlineStorage } from '@/lib/offline-storage';
import { Download, Check, Loader2, MoreHorizontal, ImageIcon, BookOpen } from 'lucide-react';

// Generate a consistent color based on the book title
function getBookColor(title: string): string {
  const colors = [
    'from-rose-800 to-rose-950',
    'from-amber-800 to-amber-950',
    'from-emerald-800 to-emerald-950',
    'from-blue-800 to-blue-950',
    'from-violet-800 to-violet-950',
    'from-slate-700 to-slate-900',
    'from-orange-800 to-orange-950',
    'from-teal-800 to-teal-950',
    'from-indigo-800 to-indigo-950',
    'from-stone-700 to-stone-900',
  ];

  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i);
    hash = hash & hash;
  }

  return colors[Math.abs(hash) % colors.length];
}
import { useDownload } from '@/lib/hooks/use-download';
import { CoverPickerDialog } from './cover-picker-dialog';

interface BookCardProps {
  book: any;
}

export function BookCard({ book }: BookCardProps) {
  const router = useRouter();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const { downloadBook, isDownloading, progress } = useDownload();

  useEffect(() => {
    loadCover();
    checkDownloaded();
  }, [book.id]);

  const loadCover = async () => {
    try {
      const offlineCover = await offlineStorage.getCover(book.id);
      if (offlineCover) {
        setCoverUrl(URL.createObjectURL(offlineCover));
        return;
      }

      if (book.coverPath) {
        const blob = await apiClient.getCover(book.id);
        setCoverUrl(URL.createObjectURL(blob));
      }
    } catch (error) {
      console.error('Failed to load cover:', error);
    }
  };

  const checkDownloaded = async () => {
    const downloaded = await offlineStorage.isBookDownloaded(book.id);
    setIsDownloaded(downloaded);
  };

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
            />
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br ${getBookColor(book.title)}`}>
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
                <p className="text-white/60 text-xs text-center mt-2 line-clamp-2">
                  {book.author}
                </p>
              )}

              {/* Decorative bottom border */}
              <div className="absolute bottom-4 left-4 right-4 h-px bg-white/10" />
              <div className="absolute bottom-3 left-4 right-4 h-px bg-white/20" />
            </div>
          )}

          {/* Hover overlay with book info */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
            <h3 className="font-medium text-sm text-white line-clamp-2 leading-snug drop-shadow-lg">
              {book.title}
            </h3>
            {book.author && (
              <p className="text-xs text-white/70 line-clamp-1 mt-1">
                {book.author}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {/* Downloaded indicator */}
            <div className={isDownloaded ? 'opacity-100' : 'opacity-0'}>
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger
                    className="flex items-center justify-center w-7 h-7 rounded-full bg-green-500 text-white shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner sideOffset={8}>
                      <Tooltip.Popup className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-xl">
                        Available offline
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center gap-1.5">
              {/* Download button */}
              {!isDownloaded && (
                <Tooltip.Provider>
                  <Tooltip.Root>
                    <Tooltip.Trigger
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white shadow-lg backdrop-blur-sm transition-all duration-150 hover:scale-105 active:scale-95"
                      onClick={handleDownload}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Positioner sideOffset={8}>
                        <Tooltip.Popup className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-xl">
                          {isDownloading ? 'Downloading...' : 'Download for offline'}
                        </Tooltip.Popup>
                      </Tooltip.Positioner>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              )}

              {/* Menu */}
              <Menu.Root>
                <Tooltip.Provider>
                  <Tooltip.Root>
                    <Menu.Trigger
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white shadow-lg backdrop-blur-sm transition-all duration-150 hover:scale-105 active:scale-95"
                      onClick={(e) => e.stopPropagation()}
                      render={
                        <Tooltip.Trigger />
                      }
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </Menu.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Positioner sideOffset={8}>
                        <Tooltip.Popup className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-xl">
                          More options
                        </Tooltip.Popup>
                      </Tooltip.Positioner>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
                <Menu.Portal>
                  <Menu.Positioner sideOffset={8} align="end">
                    <Menu.Popup className="min-w-[180px] rounded-xl bg-popover border border-border p-1.5 shadow-xl">
                      <Menu.Item
                        className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg cursor-pointer outline-none data-[highlighted]:bg-accent transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCoverPicker(true);
                        }}
                      >
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        <span>Change cover</span>
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
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
    </div>
  );
}
