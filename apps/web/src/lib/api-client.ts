import type {
  UserLogin,
  UserRegistration,
  AuthResponse,
  UserProfile,
  UserSettings,
  KokoroVoice,
  AlternativeCover,
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

  async getAlternativeCovers(bookId: string): Promise<AlternativeCover[]> {
    return this.request<AlternativeCover[]>(`/books/${bookId}/covers/alternatives`);
  }

  async updateBookCover(bookId: string, coverUrl: string): Promise<void> {
    await this.request<void>(`/books/${bookId}/cover`, {
      method: 'PUT',
      body: JSON.stringify({ coverUrl }),
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
}

export const apiClient = new APIClient();
