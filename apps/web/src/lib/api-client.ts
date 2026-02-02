import type {
  UserLogin,
  UserRegistration,
  AuthResponse,
  UserProfile,
  UserSettings,
  KokoroVoice,
  AlternativeCover,
  WatchedFolder,
  CreateWatchedFolderRequest,
  UpdateWatchedFolderRequest,
  ScanResult,
  FolderScanStatus,
} from '@chapter/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

class APIClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on init (client-side only)
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('chapter_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Request failed: ${response.statusText}`);
    }

    // Handle empty responses (204)
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('chapter_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chapter_token');
    }
  }

  // Auth
  async register(data: UserRegistration): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.token);
    return response;
  }

  async login(data: UserLogin): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.token);
    return response;
  }

  async getCurrentUser(): Promise<UserProfile> {
    return this.request<UserProfile>('/auth/me');
  }

  logout() {
    this.clearToken();
  }

  // Books
  async getBooks(): Promise<any[]> {
    return this.request<any[]>('/books');
  }

  async uploadBook(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}/books`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async getBook(bookId: string): Promise<any> {
    return this.request<any>(`/books/${bookId}`);
  }

  async getBookStructure(bookId: string): Promise<any> {
    return this.request<any>(`/books/${bookId}/structure`);
  }

  async getChapter(bookId: string, chapterIndex: number): Promise<any> {
    return this.request<any>(`/books/${bookId}/chapter/${chapterIndex}`);
  }

  async getCover(bookId: string): Promise<Blob> {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}/books/${bookId}/cover`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch cover');
    }

    return response.blob();
  }

  async deleteBook(bookId: string): Promise<void> {
    await this.request<void>(`/books/${bookId}`, {
      method: 'DELETE',
    });
  }

  async getEpubFile(bookId: string): Promise<ArrayBuffer> {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Use relative URL to go through Next.js proxy
    const response = await fetch(`/api/books/${bookId}/epub`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch EPUB file');
    }

    return response.arrayBuffer();
  }

  getEpubUrl(bookId: string): string {
    // Use relative URL to go through Next.js proxy (avoids CORS issues)
    // The token is passed as query param since epub.js can't set headers
    const params = this.token ? `?token=${encodeURIComponent(this.token)}` : '';
    return `/api/books/${bookId}/epub${params}`;
  }

  async getAlternativeCovers(bookId: string): Promise<AlternativeCover[]> {
    return this.request<AlternativeCover[]>(`/books/${bookId}/covers/alternatives`);
  }

  async updateBookCover(bookId: string, coverUrl: string): Promise<void> {
    await this.request<void>(`/books/${bookId}/cover`, {
      method: 'PUT',
      body: JSON.stringify({ coverUrl }),
    });
  }

  async updateBookMetadata(bookId: string, metadata: {
    title?: string;
    author?: string;
    isbn?: string;
    publisher?: string;
    language?: string;
    description?: string;
    publishedYear?: string;
    coverUrl?: string;
  }): Promise<void> {
    await this.request<void>(`/books/${bookId}`, {
      method: 'PATCH',
      body: JSON.stringify(metadata),
    });
  }

  // Progress
  async getProgress(bookId: string): Promise<any> {
    return this.request<any>(`/progress/${bookId}`);
  }

  async updateProgress(bookId: string, progress: any): Promise<any> {
    return this.request<any>(`/progress/${bookId}`, {
      method: 'PUT',
      body: JSON.stringify(progress),
    });
  }

  // TTS
  async getVoices(): Promise<any[]> {
    return this.request<any[]>('/tts/voices');
  }

  async getTTSHealth(): Promise<any> {
    return this.request<any>('/tts/health');
  }

  async previewVoice(voiceId: string, speed: number, temperature: number): Promise<Blob> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}/tts/preview`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ voiceId, speed, temperature }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate voice preview');
    }

    return response.blob();
  }

  // User Settings
  async getUserSettings(): Promise<UserSettings> {
    return this.request<UserSettings>('/users/me/settings');
  }

  async updateTTSConfig(config: any): Promise<void> {
    await this.request<void>('/users/me/tts-config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  // Library
  async getWatchedFolders(): Promise<WatchedFolder[]> {
    return this.request<WatchedFolder[]>('/library/folders');
  }

  async createWatchedFolder(data: CreateWatchedFolderRequest): Promise<WatchedFolder> {
    return this.request<WatchedFolder>('/library/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWatchedFolder(
    folderId: string,
    data: UpdateWatchedFolderRequest
  ): Promise<WatchedFolder> {
    return this.request<WatchedFolder>(`/library/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteWatchedFolder(folderId: string): Promise<void> {
    await this.request<void>(`/library/folders/${folderId}`, {
      method: 'DELETE',
    });
  }

  async scanFolder(folderId: string): Promise<ScanResult> {
    return this.request<ScanResult>(`/library/folders/${folderId}/scan`, {
      method: 'POST',
    });
  }

  async scanAllFolders(): Promise<ScanResult[]> {
    return this.request<ScanResult[]>('/library/scan-all', {
      method: 'POST',
    });
  }

  async getFolderScanStatus(folderId: string): Promise<FolderScanStatus> {
    return this.request<FolderScanStatus>(`/library/folders/${folderId}/status`);
  }
}

export const apiClient = new APIClient();
