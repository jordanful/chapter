import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiClient } from '../api-client';
import { useUploadStore } from '../stores/upload-store';
export type { UploadingBook } from '../stores/upload-store';

const MAX_CONCURRENT_UPLOADS = 3;

export function useBooks() {
  const queryClient = useQueryClient();
  const { uploadingBooks, addUploads, updateUpload, removeUpload, updateQueuePositions } = useUploadStore();

  const { data: books, isLoading } = useQuery({
    queryKey: ['books'],
    queryFn: () => apiClient.getBooks(),
  });

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

  const uploadBooks = useCallback(async (files: File[]) => {
    // Create placeholder entries for all files - first few are uploading, rest are queued
    const newUploads = files.map((file, index) => ({
      id: `upload-${Date.now()}-${index}-${file.name}`,
      filename: file.name.replace(/\.epub$/i, ''),
      status: index < MAX_CONCURRENT_UPLOADS ? 'uploading' as const : 'queued' as const,
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
      updateQueuePositions(queue.map(q => q.uploadId));

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
      Array(initialBatch).fill(null).map(() => processNext())
    );

    // Return results
    const successful = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    return { successful: successful.length, failed: failed.length, total: files.length };
  }, [queryClient, addUploads, updateUpload, removeUpload, updateQueuePositions]);

  const dismissUploadError = useCallback((uploadId: string) => {
    removeUpload(uploadId);
  }, [removeUpload]);

  return {
    books: books || [],
    isLoading,
    uploadBook: uploadMutation.mutateAsync,
    uploadBooks,
    uploadingBooks,
    dismissUploadError,
    deleteBook: deleteMutation.mutateAsync,
    isUploading: uploadMutation.isPending || uploadingBooks.some((u) => u.status === 'uploading' || u.status === 'processing' || u.status === 'queued'),
    uploadError: uploadMutation.error,
  };
}

export function useBook(bookId: string) {
  return useQuery({
    queryKey: ['book', bookId],
    queryFn: () => apiClient.getBook(bookId),
    enabled: !!bookId,
  });
}

export function useBookStructure(bookId: string) {
  return useQuery({
    queryKey: ['book-structure', bookId],
    queryFn: () => apiClient.getBookStructure(bookId),
    enabled: !!bookId,
  });
}

export function useChapter(bookId: string, chapterIndex: number) {
  return useQuery({
    queryKey: ['chapter', bookId, chapterIndex],
    queryFn: () => apiClient.getChapter(bookId, chapterIndex),
    enabled: !!bookId && chapterIndex >= 0,
  });
}
