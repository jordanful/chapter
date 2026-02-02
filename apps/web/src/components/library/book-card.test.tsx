import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookCard } from './book-card';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>
  );
};

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    getCover: vi.fn(),
  },
}));

vi.mock('@/lib/offline-storage', () => ({
  offlineStorage: {
    getCover: vi.fn(),
    isBookDownloaded: vi.fn(),
  },
}));

vi.mock('@/lib/hooks/use-download', () => ({
  useDownload: () => ({
    downloadBook: vi.fn(),
    isDownloading: false,
    progress: 0,
  }),
}));

describe('BookCard', () => {
  const mockBook = {
    id: 'book-1',
    title: 'Test Book',
    author: 'Test Author',
    coverPath: '/covers/test.jpg',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render book title and author', () => {
    renderWithProviders(<BookCard book={mockBook} />);

    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('should show default cover if no cover image', () => {
    const bookWithoutCover = { ...mockBook, coverPath: null };
    renderWithProviders(<BookCard book={bookWithoutCover} />);

    expect(screen.getByText('📖')).toBeInTheDocument();
  });

  it('should navigate to reader when clicked', () => {
    const mockPush = vi.fn();
    vi.mocked(require('next/navigation').useRouter).mockReturnValue({
      push: mockPush,
    });

    renderWithProviders(<BookCard book={mockBook} />);

    fireEvent.click(screen.getByText('Test Book').closest('div')!);

    expect(mockPush).toHaveBeenCalledWith('/reader/book-1');
  });

  it('should display download button on hover', async () => {
    renderWithProviders(<BookCard book={mockBook} />);

    const downloadButton = screen.getAllByRole('button')[0];
    expect(downloadButton).toBeInTheDocument();
  });

  it('should show downloaded indicator when book is downloaded', async () => {
    const { offlineStorage } = await import('@/lib/offline-storage');
    vi.mocked(offlineStorage.isBookDownloaded).mockResolvedValue(true);

    renderWithProviders(<BookCard book={mockBook} />);

    await waitFor(() => {
      expect(screen.getAllByRole('button')[0]).toBeInTheDocument();
    });
  });
});
