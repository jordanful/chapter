import { useState } from 'react';
import { apiClient } from '../api-client';
import { offlineStorage } from '../offline-storage';

export function useDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const downloadBook = async (bookId: string) => {
    setIsDownloading(true);
    setProgress(0);
    setError(null);

    try {
      // 1. Get book metadata
      setProgress(10);
      const book = await apiClient.getBook(bookId);
      const structure = await apiClient.getBookStructure(bookId);

      // 2. Download cover
      setProgress(20);
      try {
        const coverBlob = await apiClient.getCover(bookId);
        await offlineStorage.saveCover(bookId, coverBlob);
      } catch (err) {
        console.warn('No cover available');
      }

      // 3. Download all chapters
      const totalChapters = structure.chapters.length;
      for (let i = 0; i < totalChapters; i++) {
        const chapter = await apiClient.getChapter(bookId, i);
        await offlineStorage.saveChapter({
          bookId,
          chapterIndex: i,
          data: chapter,
        });

        // Update progress (20-90% for chapters)
        const chapterProgress = 20 + ((i + 1) / totalChapters) * 70;
        setProgress(Math.round(chapterProgress));
      }

      // 4. Save book metadata
      setProgress(95);
      await offlineStorage.saveBook({
        id: bookId,
        metadata: book,
        structure,
        downloadedAt: Date.now(),
      });

      setProgress(100);
      setIsDownloading(false);
    } catch (err) {
      setError(err as Error);
      setIsDownloading(false);
      throw err;
    }
  };

  const deleteDownload = async (bookId: string) => {
    await offlineStorage.deleteBook(bookId);
  };

  const isDownloaded = async (bookId: string) => {
    return offlineStorage.isBookDownloaded(bookId);
  };

  return {
    downloadBook,
    deleteDownload,
    isDownloaded,
    isDownloading,
    progress,
    error,
  };
}
