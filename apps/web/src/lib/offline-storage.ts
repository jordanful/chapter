/**
 * Offline storage using IndexedDB for downloaded books
 */

const DB_NAME = 'chapter-offline';
const DB_VERSION = 1;
const BOOKS_STORE = 'books';
const CHAPTERS_STORE = 'chapters';
const COVERS_STORE = 'covers';

interface OfflineBook {
  id: string;
  metadata: any;
  downloadedAt: number;
  structure: any;
}

interface OfflineChapter {
  bookId: string;
  chapterIndex: number;
  data: any;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Books store
        if (!db.objectStoreNames.contains(BOOKS_STORE)) {
          db.createObjectStore(BOOKS_STORE, { keyPath: 'id' });
        }

        // Chapters store
        if (!db.objectStoreNames.contains(CHAPTERS_STORE)) {
          const chaptersStore = db.createObjectStore(CHAPTERS_STORE, {
            keyPath: ['bookId', 'chapterIndex'],
          });
          chaptersStore.createIndex('bookId', 'bookId', { unique: false });
        }

        // Covers store
        if (!db.objectStoreNames.contains(COVERS_STORE)) {
          db.createObjectStore(COVERS_STORE, { keyPath: 'bookId' });
        }
      };
    });
  }

  // Books
  async saveBook(book: OfflineBook): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BOOKS_STORE], 'readwrite');
      const store = transaction.objectStore(BOOKS_STORE);
      const request = store.put(book);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getBook(bookId: string): Promise<OfflineBook | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BOOKS_STORE], 'readonly');
      const store = transaction.objectStore(BOOKS_STORE);
      const request = store.get(bookId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllBooks(): Promise<OfflineBook[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BOOKS_STORE], 'readonly');
      const store = transaction.objectStore(BOOKS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteBook(bookId: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [BOOKS_STORE, CHAPTERS_STORE, COVERS_STORE],
        'readwrite'
      );

      // Delete book
      const booksStore = transaction.objectStore(BOOKS_STORE);
      booksStore.delete(bookId);

      // Delete chapters
      const chaptersStore = transaction.objectStore(CHAPTERS_STORE);
      const index = chaptersStore.index('bookId');
      const chaptersRequest = index.openCursor(IDBKeyRange.only(bookId));

      chaptersRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Delete cover
      const coversStore = transaction.objectStore(COVERS_STORE);
      coversStore.delete(bookId);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Chapters
  async saveChapter(chapter: OfflineChapter): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHAPTERS_STORE], 'readwrite');
      const store = transaction.objectStore(CHAPTERS_STORE);
      const request = store.put(chapter);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getChapter(bookId: string, chapterIndex: number): Promise<any | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHAPTERS_STORE], 'readonly');
      const store = transaction.objectStore(CHAPTERS_STORE);
      const request = store.get([bookId, chapterIndex]);

      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Covers
  async saveCover(bookId: string, blob: Blob): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([COVERS_STORE], 'readwrite');
      const store = transaction.objectStore(COVERS_STORE);
      const request = store.put({ bookId, blob });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCover(bookId: string): Promise<Blob | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([COVERS_STORE], 'readonly');
      const store = transaction.objectStore(COVERS_STORE);
      const request = store.get(bookId);

      request.onsuccess = () => resolve(request.result?.blob || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Check if book is downloaded
  async isBookDownloaded(bookId: string): Promise<boolean> {
    const book = await this.getBook(bookId);
    return !!book;
  }

  // Get storage usage
  async getStorageEstimate(): Promise<{ usage: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { usage: 0, quota: 0 };
  }
}

export const offlineStorage = new OfflineStorage();
