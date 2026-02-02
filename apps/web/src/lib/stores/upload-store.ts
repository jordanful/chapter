import { create } from 'zustand';

export interface UploadingBook {
  id: string;
  filename: string;
  status: 'queued' | 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
  position?: number;
}

interface UploadStore {
  uploadingBooks: UploadingBook[];
  addUploads: (uploads: UploadingBook[]) => void;
  updateUpload: (id: string, updates: Partial<UploadingBook>) => void;
  removeUpload: (id: string) => void;
  updateQueuePositions: (activeIds: string[]) => void;
}

export const useUploadStore = create<UploadStore>((set) => ({
  uploadingBooks: [],

  addUploads: (uploads) =>
    set((state) => ({
      uploadingBooks: [...state.uploadingBooks, ...uploads],
    })),

  updateUpload: (id, updates) =>
    set((state) => ({
      uploadingBooks: state.uploadingBooks.map((u) =>
        u.id === id ? { ...u, ...updates } : u
      ),
    })),

  removeUpload: (id) =>
    set((state) => ({
      uploadingBooks: state.uploadingBooks.filter((u) => u.id !== id),
    })),

  updateQueuePositions: (queuedIds) =>
    set((state) => ({
      uploadingBooks: state.uploadingBooks.map((u) => {
        const queueIndex = queuedIds.indexOf(u.id);
        if (queueIndex !== -1) {
          return { ...u, position: queueIndex + 1 };
        }
        return u;
      }),
    })),
}));
