'use client';

import { Loader2, AlertCircle, X, Clock } from 'lucide-react';
import type { UploadingBook } from '@/lib/hooks/use-books';

interface UploadingBookCardProps {
  upload: UploadingBook;
  onDismiss?: (id: string) => void;
}

export function UploadingBookCard({ upload, onDismiss }: UploadingBookCardProps) {
  const isError = upload.status === 'error';
  const isQueued = upload.status === 'queued';
  const isUploading = upload.status === 'uploading';

  const getStatusText = () => {
    switch (upload.status) {
      case 'queued':
        return upload.position ? `#${upload.position} in queue` : 'Queued';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'error':
        return 'Failed';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="group">
      <div className="relative">
        {/* Book cover placeholder */}
        <div className="aspect-[2/3] overflow-hidden relative book-cover">
          {/* Spine shadow overlay */}
          <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 via-black/20 to-transparent z-10 pointer-events-none" />

          {/* Page edge effect on right side */}
          <div className="absolute inset-y-1 right-0 w-1 bg-gradient-to-l from-stone-400 to-stone-200 z-10 pointer-events-none rounded-r-sm" />

          <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 bg-gradient-to-br from-stone-600 to-stone-700 p-4">
            {isError ? (
              <>
                <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                <span className="text-xs text-center text-red-300 line-clamp-2">{upload.error}</span>
              </>
            ) : isQueued ? (
              <>
                <Clock className="w-8 h-8 mb-2 opacity-60" />
                <span className="text-xs text-center opacity-80">
                  {upload.position ? `#${upload.position} in queue` : 'Queued'}
                </span>
              </>
            ) : (
              <>
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs text-center">
                  {isUploading ? 'Uploading...' : 'Processing...'}
                </span>
              </>
            )}
          </div>

          {/* Hover overlay with filename */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
            <h3 className="font-medium text-xs text-white line-clamp-2 leading-snug drop-shadow-lg">
              {upload.filename}
            </h3>
            <p className="text-xs text-white/70 mt-1">
              {getStatusText()}
            </p>
          </div>

          {/* Dismiss button for errors */}
          {isError && onDismiss && (
            <button
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-20"
              onClick={() => onDismiss(upload.id)}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
