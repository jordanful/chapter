export interface WatchedFolder {
  id: string;
  userId: string;
  path: string;
  name: string | null;
  isActive: boolean;
  lastScanAt: Date | null;
  lastScanStatus: 'idle' | 'scanning' | 'error';
  lastScanError: string | null;
  booksFound: number;
  totalScans: number;
  booksImported: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWatchedFolderRequest {
  path: string;
  name?: string;
}

export interface UpdateWatchedFolderRequest {
  name?: string;
  isActive?: boolean;
}

export interface ScanResult {
  folderId: string;
  status: 'completed' | 'error';
  booksFound: number;
  booksImported: number;
  booksSkipped: number;
  errors: string[];
  duration: number;
}

export interface FolderScanStatus {
  folderId: string;
  status: 'idle' | 'scanning' | 'error';
  booksFound: number;
  lastScanAt: Date | null;
  lastScanError: string | null;
}
