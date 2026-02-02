import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../api-client';

export interface ReadingProgress {
  bookId: string;
  chapterIndex: number;
  chapterId?: string;
  paragraphIndex: number;
  charPosition: number;
  percentage: number;
  scrollPosition: number;
  audioTimestamp: number;
  audioChunkId?: string;
  mode: 'reading' | 'audio';
  lastReadAt: string;
}

export interface ProgressUpdate {
  chapterIndex: number;
  chapterId?: string;
  paragraphIndex?: number;
  charPosition?: number;
  scrollPosition?: number;
  audioTimestamp?: number;
  audioChunkId?: string;
  mode?: 'reading' | 'audio';
}

const AUTOSAVE_INTERVAL = 5000; // Auto-save every 5 seconds

export function useProgress(bookId: string | null) {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const pendingUpdateRef = useRef<ProgressUpdate | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<ProgressUpdate | null>(null);

  // Fetch progress on mount
  useEffect(() => {
    if (!bookId) return;

    const fetchProgress = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.getProgress(bookId);
        setProgress(data);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to fetch progress:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [bookId]);

  // Auto-save pending updates
  useEffect(() => {
    if (!bookId || !pendingUpdateRef.current) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule save
    saveTimeoutRef.current = setTimeout(async () => {
      if (!pendingUpdateRef.current) return;

      try {
        const updated = await apiClient.updateProgress(bookId, pendingUpdateRef.current);
        setProgress(updated);
        lastSaveRef.current = pendingUpdateRef.current;
        pendingUpdateRef.current = null;
      } catch (err) {
        console.error('Failed to auto-save progress:', err);
      }
    }, AUTOSAVE_INTERVAL);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [bookId, pendingUpdateRef.current]);

  // Update progress (debounced)
  const updateProgress = useCallback((update: ProgressUpdate) => {
    pendingUpdateRef.current = {
      ...pendingUpdateRef.current,
      ...update,
    };

    // Force a re-render to trigger the auto-save effect
    setProgress((prev) => (prev ? { ...prev, ...update } as ReadingProgress : null));
  }, []);

  // Save immediately (for explicit saves, like when closing)
  const saveNow = useCallback(async () => {
    if (!bookId || !pendingUpdateRef.current) return;

    try {
      const updated = await apiClient.updateProgress(bookId, pendingUpdateRef.current);
      setProgress(updated);
      lastSaveRef.current = pendingUpdateRef.current;
      pendingUpdateRef.current = null;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    } catch (err) {
      console.error('Failed to save progress:', err);
      throw err;
    }
  }, [bookId]);

  return {
    progress,
    isLoading,
    error,
    updateProgress,
    saveNow,
  };
}
