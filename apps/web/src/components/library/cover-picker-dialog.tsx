'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X, Loader2, AlertCircle, Check, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAlternativeCovers, useUpdateCover } from '@/lib/hooks/use-cover-picker';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { AlternativeCover } from '@chapter/types';

interface CoverPickerDialogProps {
  book: any;
  isOpen: boolean;
  onClose: () => void;
}

function CoverImage({
  src,
  alt,
  className,
  onError: onErrorProp,
}: {
  src: string;
  alt: string;
  className?: string;
  onError?: () => void;
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setError(false);
    setLoaded(false);
  }, [src]);

  if (error) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}>
        <ImageOff className="w-6 h-6" />
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className={cn("flex items-center justify-center bg-muted", className)}>
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(className, !loaded && "hidden")}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          onErrorProp?.();
        }}
        loading="lazy"
      />
    </>
  );
}

export function CoverPickerDialog({ book, isOpen, onClose }: CoverPickerDialogProps) {
  const [selectedCover, setSelectedCover] = useState<AlternativeCover | null>(null);
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null);
  const [currentCoverError, setCurrentCoverError] = useState(false);
  const [failedCovers, setFailedCovers] = useState<Set<string>>(new Set());

  const {
    data: covers,
    isLoading,
    error,
  } = useAlternativeCovers(book.id, isOpen);

  const updateCover = useUpdateCover(book.id);
  const validCovers = covers?.filter(c => !failedCovers.has(c.coverUrl)) || [];

  useEffect(() => {
    if (isOpen && book.coverPath) {
      loadCurrentCover();
    }
  }, [isOpen, book.id]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCover(null);
      setCurrentCoverUrl(null);
      setCurrentCoverError(false);
      setFailedCovers(new Set());
    }
  }, [isOpen]);

  const loadCurrentCover = async () => {
    try {
      setCurrentCoverError(false);
      const blob = await apiClient.getCover(book.id);
      // 43 bytes is Open Library's "no image" placeholder
      if (blob.size > 100) {
        const url = URL.createObjectURL(blob);
        setCurrentCoverUrl(url);
      } else {
        setCurrentCoverError(true);
      }
    } catch (err) {
      console.error('Failed to load current cover:', err);
      setCurrentCoverError(true);
    }
  };

  const handleSave = async () => {
    if (!selectedCover) return;

    try {
      await updateCover.mutateAsync(selectedCover.coverUrl);
      onClose();
    } catch (error) {
      console.error('Failed to update cover:', error);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-xl shadow-2xl max-w-3xl w-[calc(100%-2rem)] max-h-[85vh] flex flex-col outline-none transition-all data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b">
            <Dialog.Title className="text-lg font-semibold">
              Change Cover
            </Dialog.Title>
            <Dialog.Close className="p-2 -m-2 rounded-lg hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Current cover */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Current Cover
              </h3>
              <div className="w-28 aspect-[2/3] bg-muted rounded-xl overflow-hidden shadow-sm">
                {currentCoverUrl && !currentCoverError ? (
                  <CoverImage
                    src={currentCoverUrl}
                    alt="Current cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <span className="text-3xl">📖</span>
                  </div>
                )}
              </div>
            </div>

            {/* Alternative covers */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Alternative Covers from Open Library
              </h3>

              {isLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mb-3" />
                  <span className="text-sm">Searching for covers...</span>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center py-16 text-destructive">
                  <AlertCircle className="w-8 h-8 mb-3" />
                  <span className="text-sm">Failed to load alternative covers</span>
                </div>
              )}

              {!isLoading && !error && validCovers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <span className="text-4xl mb-3">🔍</span>
                  <span className="text-sm">No alternative covers found</span>
                </div>
              )}

              {!isLoading && !error && validCovers.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {validCovers.map((cover, index) => (
                    <button
                      key={`${cover.coverUrl}-${index}`}
                      onClick={() => setSelectedCover(cover)}
                      className={cn(
                        'relative aspect-[2/3] bg-muted rounded-xl overflow-hidden transition-all ring-2 hover:scale-[1.02] active:scale-[0.98]',
                        selectedCover?.coverUrl === cover.coverUrl
                          ? 'ring-primary ring-offset-2 ring-offset-background'
                          : 'ring-transparent hover:ring-muted-foreground/20'
                      )}
                    >
                      <CoverImage
                        src={cover.coverUrl}
                        alt={cover.editionTitle || 'Alternative cover'}
                        className="w-full h-full object-cover"
                        onError={() => {
                          setFailedCovers(prev => new Set([...prev, cover.coverUrl]));
                        }}
                      />
                      {selectedCover?.coverUrl === cover.coverUrl && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg">
                            <Check className="w-4 h-4" strokeWidth={2.5} />
                          </div>
                        </div>
                      )}
                      {cover.year && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-xs px-2 py-1.5 text-center font-medium">
                          {cover.year}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-5 border-t bg-muted/30">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!selectedCover || updateCover.isPending}
            >
              {updateCover.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
