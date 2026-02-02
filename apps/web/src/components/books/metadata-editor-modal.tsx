'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Image as ImageIcon, Info, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAlternativeCovers } from '@/lib/hooks/use-cover-picker';
import { apiClient } from '@/lib/api-client';

interface MetadataEditorModalProps {
  book: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (metadata: any) => Promise<void>;
}

type TabType = 'general' | 'cover' | 'info' | 'advanced';

export function MetadataEditorModal({ book, isOpen, onClose, onSave }: MetadataEditorModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    language: '',
    description: '',
    publishedYear: '',
    coverUrl: '',
  });

  const { data: alternativeCovers, isLoading: coversLoading, error: coversError } = useAlternativeCovers(book?.id, isOpen);
  const [selectedCoverUrl, setSelectedCoverUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<number>>(new Set());
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null);

  // Only render on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Proxy Open Library images through server to bypass CORS
  const proxyImageUrl = (url: string) => {
    if (url.startsWith('https://covers.openlibrary.org/')) {
      // Always use relative URL to avoid CORS issues
      return `/api/books/cover-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Strip HTML tags from text
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Initialize form with book data
  useEffect(() => {
    if (book && isOpen) {
      setFormData({
        title: book.title || '',
        author: book.author || '',
        isbn: book.isbn || '',
        publisher: book.publisher || '',
        language: book.language || '',
        description: book.description ? stripHtml(book.description) : '',
        publishedYear: book.publishedYear || '',
        coverUrl: book.coverUrl || '',
      });
      setSelectedCoverUrl(null);
      setImageErrors(new Set());
      setImageLoading(new Set());
    }
  }, [book, isOpen]);

  // Load current cover when modal opens
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Clear previous cover first
    setCurrentCoverUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    if (!book?.coverPath) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const blob = await apiClient.getCover(book.id);
        if (!cancelled) {
          const objectUrl = URL.createObjectURL(blob);
          setCurrentCoverUrl(objectUrl);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load current cover:', error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, book?.id, book?.coverPath]);

  // Cleanup cover URL on unmount
  useEffect(() => {
    return () => {
      setCurrentCoverUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  // Initialize loading state for alternative covers
  useEffect(() => {
    if (alternativeCovers && alternativeCovers.length > 0) {
      setImageLoading(new Set(alternativeCovers.map((_, i) => i)));
    }
  }, [alternativeCovers]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const dataToSave = {
      ...formData,
      coverUrl: selectedCoverUrl || formData.coverUrl,
    };

    try {
      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error('Failed to save metadata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: '≡' },
    { id: 'cover' as const, label: 'Cover', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'info' as const, label: 'Info', icon: <Info className="w-4 h-4" /> },
    { id: 'advanced' as const, label: 'Advanced', icon: <Settings className="w-4 h-4" /> },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl h-[90vh] bg-[#1a1a1a] rounded-lg shadow-2xl flex overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-[#252525] border-b border-gray-700 flex items-center justify-between px-6 z-10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-gray-400">✎</span>
            Edit {book?.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar */}
        <div className="w-56 bg-[#252525] border-r border-gray-700 flex-shrink-0 pt-16">
          <div className="py-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#cc7b19] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  {typeof tab.icon === 'string' ? tab.icon : tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col pt-16">
          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'general' && (
              <div className="space-y-6 max-w-3xl">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm text-gray-300">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Book title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author" className="text-sm text-gray-300">
                    Author
                  </Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => handleChange('author', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Author name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="isbn" className="text-sm text-gray-300">
                      ISBN
                    </Label>
                    <Input
                      id="isbn"
                      value={formData.isbn}
                      onChange={(e) => handleChange('isbn', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="ISBN-10 or ISBN-13"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publishedYear" className="text-sm text-gray-300">
                      Published Year
                    </Label>
                    <Input
                      id="publishedYear"
                      value={formData.publishedYear}
                      onChange={(e) => handleChange('publishedYear', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="YYYY"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="publisher" className="text-sm text-gray-300">
                      Publisher
                    </Label>
                    <Input
                      id="publisher"
                      value={formData.publisher}
                      onChange={(e) => handleChange('publisher', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Publisher name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language" className="text-sm text-gray-300">
                      Language
                    </Label>
                    <Input
                      id="language"
                      value={formData.language}
                      onChange={(e) => handleChange('language', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="en, es, fr, etc."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm text-gray-300">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white min-h-[120px]"
                    placeholder="Book description or summary"
                  />
                </div>
              </div>
            )}

            {activeTab === 'cover' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-4">Current Cover</h3>
                  <div className="w-48 h-72 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700">
                    {currentCoverUrl ? (
                      <img
                        src={currentCoverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : book?.coverPath ? (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <div className="animate-spin h-5 w-5 border-2 border-gray-600 border-t-white rounded-full" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        No cover
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-4">Alternative Covers</h3>
                  {coversLoading ? (
                    <div className="text-sm text-gray-400">Loading alternatives...</div>
                  ) : coversError ? (
                    <div className="text-sm text-red-400">Failed to load covers: {coversError.message}</div>
                  ) : alternativeCovers && alternativeCovers.length > 0 ? (
                    <div className="grid grid-cols-4 gap-4">
                      {alternativeCovers.map((cover: any, index: number) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedCoverUrl(cover.coverUrl)}
                          className={`relative w-full aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden transition-all ${
                            selectedCoverUrl === cover.coverUrl
                              ? 'ring-4 ring-[#cc7b19]'
                              : 'hover:ring-2 ring-gray-600'
                          }`}
                        >
                          {imageErrors.has(index) ? (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                              Failed to load
                            </div>
                          ) : (
                            <>
                              <img
                                src={proxyImageUrl(cover.coverUrl)}
                                alt={cover.editionTitle || 'Alternative cover'}
                                className="w-full h-full object-cover"
                                onLoad={() => {
                                  setImageLoading(prev => {
                                    const next = new Set(prev);
                                    next.delete(index);
                                    return next;
                                  });
                                }}
                                onError={(e) => {
                                  console.error('Failed to load cover:', cover.coverUrl, e);
                                  setImageErrors(prev => new Set(prev).add(index));
                                  setImageLoading(prev => {
                                    const next = new Set(prev);
                                    next.delete(index);
                                    return next;
                                  });
                                }}
                              />
                              {imageLoading.has(index) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                  <div className="animate-spin h-5 w-5 border-2 border-gray-600 border-t-white rounded-full" />
                                </div>
                              )}
                            </>
                          )}
                          {cover.year && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs text-white py-1 px-2 text-center">
                              {cover.year}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">
                      No alternative covers found. Try updating the ISBN or title.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'info' && (
              <div className="space-y-6 max-w-3xl">
                <div className="text-sm text-gray-400 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-500 mb-1">File Size</div>
                      <div className="text-white">
                        {book?.fileSize ? `${(book.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Total Words</div>
                      <div className="text-white">{book?.totalWords?.toLocaleString() || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-500 mb-1">Total Chapters</div>
                      <div className="text-white">{book?.totalChapters || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Total Characters</div>
                      <div className="text-white">{book?.totalCharacters?.toLocaleString() || 'N/A'}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-500 mb-1">Added</div>
                    <div className="text-white">
                      {book?.createdAt ? new Date(book.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-500 mb-1">File Hash</div>
                    <div className="text-white font-mono text-xs break-all">{book?.fileHash || 'N/A'}</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-6 max-w-3xl">
                <div className="text-sm text-gray-400">
                  <p className="mb-4">Advanced settings and technical details.</p>

                  <div className="space-y-4">
                    <div>
                      <div className="text-gray-500 mb-1">File Path</div>
                      <div className="text-white font-mono text-xs bg-gray-800 p-3 rounded border border-gray-700 break-all">
                        {book?.filePath || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-500 mb-2">EPUB Metadata</div>
                      {book?.epubMetadata && (
                        <pre className="text-white font-mono text-xs bg-gray-800 p-3 rounded border border-gray-700 overflow-auto max-h-96">
                          {JSON.stringify(book.epubMetadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 bg-[#1a1a1a] px-8 py-4 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#cc7b19] hover:bg-[#b36a15] text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
