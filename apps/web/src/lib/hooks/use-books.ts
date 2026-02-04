import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState, useEffect } from 'react';
import { apiClient } from '../api-client';
import { useUploadStore } from '../stores/upload-store';
import { offlineStorage } from '../offline-storage';
import { useOnlineStatus } from './use-online-status';
export type { UploadingBook } from '../stores/upload-store';

const MAX_CONCURRENT_UPLOADS = 3;

export function useBooks() {
  const queryClient = useQueryClient();
  const { uploadingBooks, addUploads, updateUpload, removeUpload, updateQueuePositions } =
    useUploadStore();
  const { isOnline } = useOnlineStatus();
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const {
    data: books,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      try {
        const result = await apiClient.getBooks();
        setIsOfflineMode(false);
        return result;
      } catch (err) {
        // If network request fails, fall back to offline storage
        const offlineBooks = await offlineStorage.getAllBooks();
        if (offlineBooks.length > 0) {
          setIsOfflineMode(true);
          // Transform offline books to match API format
          return offlineBooks.map((book) => ({
            ...book.metadata,
            id: book.id,
            isOffline: true,
          }));
        }
        // Re-throw if no offline books available
        throw err;
      }
    },
    refetchOnMount: 'always',
    refetchInterval: (query) => {
      // Don't poll in offline mode
      if (isOfflineMode || !isOnline) return false;
      // Poll every 2 seconds if library is empty (for seed book imports)
      // Stop after books appear or query is stale (15 seconds)
      const isEmpty = !query.state.data || query.state.data.length === 0;
      const dataAge = Date.now() - (query.state.dataUpdatedAt || 0);
      const shouldPoll = isEmpty && dataAge < 15000;
      return shouldPoll ? 2000 : false;
    },
    retry: (failureCount, error) => {
      // Don't retry if we're offline
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
  });

  // When coming back online, refetch
  useEffect(() => {
    if (isOnline && isOfflineMode) {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    }
  }, [isOnline, isOfflineMode, queryClient]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => apiClient.uploadBook(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (bookId: string) => apiClient.deleteBook(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ bookId, isFavorite }: { bookId: string; isFavorite: boolean }) =>
      apiClient.toggleFavorite(bookId, isFavorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  const uploadBooks = useCallback(
    async (files: File[]) => {
      // Create placeholder entries for all files - first few are uploading, rest are queued
      const newUploads = files.map((file, index) => ({
        id: `upload-${Date.now()}-${index}-${file.name}`,
        filename: file.name.replace(/\.epub$/i, ''),
        status: index < MAX_CONCURRENT_UPLOADS ? ('uploading' as const) : ('queued' as const),
        position: index < MAX_CONCURRENT_UPLOADS ? undefined : index - MAX_CONCURRENT_UPLOADS + 1,
      }));

      addUploads(newUploads);

      // Process files with concurrency limit
      const uploadFile = async (file: File, uploadId: string): Promise<any> => {
        try {
          // Update to uploading status
          updateUpload(uploadId, { status: 'uploading', position: undefined });

          const result = await apiClient.uploadBook(file);

          // Mark as done
          updateUpload(uploadId, { status: 'done' });

          // Refresh books list immediately when each book completes
          queryClient.invalidateQueries({ queryKey: ['books'] });

          // Remove from uploading list after a brief delay
          setTimeout(() => {
            removeUpload(uploadId);
          }, 500);

          return result;
        } catch (error) {
          // Mark as error
          updateUpload(uploadId, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed',
          });
          throw error;
        }
      };

      // Process with concurrency limit
      const results: PromiseSettledResult<any>[] = [];
      const queue = files.map((file, index) => ({ file, uploadId: newUploads[index].id }));

      const processNext = async (): Promise<void> => {
        const item = queue.shift();
        if (!item) return;

        // Update queue positions for remaining items
        updateQueuePositions(queue.map((q) => q.uploadId));

        try {
          const result = await uploadFile(item.file, item.uploadId);
          results.push({ status: 'fulfilled', value: result });
        } catch (error) {
          results.push({ status: 'rejected', reason: error });
        }

        // Process next item in queue
        await processNext();
      };

      // Start initial batch of concurrent uploads
      const initialBatch = Math.min(MAX_CONCURRENT_UPLOADS, files.length);
      await Promise.all(
        Array(initialBatch)
          .fill(null)
          .map(() => processNext())
      );

      // Return results
      const successful = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      return { successful: successful.length, failed: failed.length, total: files.length };
    },
    [queryClient, addUploads, updateUpload, removeUpload, updateQueuePositions]
  );

  const dismissUploadError = useCallback(
    (uploadId: string) => {
      removeUpload(uploadId);
    },
    [removeUpload]
  );

  const toggleFavorite = useCallback(
    async (bookId: string, isFavorite: boolean) => {
      await favoriteMutation.mutateAsync({ bookId, isFavorite });
    },
    [favoriteMutation]
  );

  return {
    books: books || [],
    isLoading,
    isOfflineMode,
    uploadBook: uploadMutation.mutateAsync,
    uploadBooks,
    uploadingBooks,
    dismissUploadError,
    deleteBook: deleteMutation.mutateAsync,
    toggleFavorite,
    isUploading:
      uploadMutation.isPending ||
      uploadingBooks.some(
        (u) => u.status === 'uploading' || u.status === 'processing' || u.status === 'queued'
      ),
    uploadError: uploadMutation.error,
  };
}

export function useBook(bookId: string) {
  return useQuery({
    queryKey: ['book', bookId],
    queryFn: async () => {
      try {
        return await apiClient.getBook(bookId);
      } catch {
        // Fall back to offline storage
        const offlineBook = await offlineStorage.getBook(bookId);
        if (offlineBook) {
          return { ...offlineBook.metadata, id: bookId };
        }
        throw new Error('Book not available offline');
      }
    },
    enabled: !!bookId,
    retry: (failureCount) => {
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
  });
}

export function useBookStructure(bookId: string) {
  return useQuery({
    queryKey: ['book-structure', bookId],
    queryFn: async () => {
      try {
        return await apiClient.getBookStructure(bookId);
      } catch {
        // Fall back to offline storage
        const offlineBook = await offlineStorage.getBook(bookId);
        if (offlineBook?.structure) {
          return offlineBook.structure;
        }
        throw new Error('Book structure not available offline');
      }
    },
    enabled: !!bookId,
    retry: (failureCount) => {
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
  });
}

export function useChapter(bookId: string, chapterIndex: number) {
  return useQuery({
    queryKey: ['chapter', bookId, chapterIndex],
    queryFn: async () => {
      try {
        return await apiClient.getChapter(bookId, chapterIndex);
      } catch {
        // Fall back to offline storage
        const offlineChapter = await offlineStorage.getChapter(bookId, chapterIndex);
        if (offlineChapter) {
          return offlineChapter;
        }
        throw new Error('Chapter not available offline');
      }
    },
    enabled: !!bookId && chapterIndex >= 0,
    retry: (failureCount) => {
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
  });
}
