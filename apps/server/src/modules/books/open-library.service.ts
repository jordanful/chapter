import type { AlternativeCover } from '@chapter/types';

interface CacheEntry {
  data: AlternativeCover[];
  timestamp: number;
}

interface OpenLibrarySearchDoc {
  key: string;
  title: string;
  author_name?: string[];
  isbn?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_key?: string[];
}

interface OpenLibraryEdition {
  key: string;
  title: string;
  publish_date?: string;
  isbn_10?: string[];
  isbn_13?: string[];
  covers?: number[];
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const COVER_SIZE = 'L'; // L = large, M = medium, S = small
const PLACEHOLDER_SIZE = 43; // Open Library's "no image" placeholder is 43 bytes

// Valid ISBN-10 is 10 digits (last can be X), ISBN-13 is 13 digits
function isValidISBN(isbn: string): boolean {
  const clean = isbn.replace(/[-\s]/g, '');
  return /^(\d{10}|\d{9}X|\d{13})$/i.test(clean);
}

class OpenLibraryService {
  private cache: Map<string, CacheEntry> = new Map();

  private getCacheKey(title: string, author?: string | null): string {
    return `${title.toLowerCase()}:${(author || '').toLowerCase()}`;
  }

  private getFromCache(key: string): AlternativeCover[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache(key: string, data: AlternativeCover[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  async searchEditions(
    title: string,
    author?: string | null,
    isbn?: string | null
  ): Promise<AlternativeCover[]> {
    const cacheKey = this.getCacheKey(title, author);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const covers: AlternativeCover[] = [];

    // Try ISBN first if available and valid
    if (isbn && isValidISBN(isbn)) {
      const isbnCovers = await this.getCoverByISBN(isbn);
      if (isbnCovers.length > 0) {
        covers.push(...isbnCovers);
      }
    }

    // Search by title and author
    const searchCovers = await this.searchByTitleAuthor(title, author);

    // Deduplicate by coverUrl
    const seen = new Set(covers.map((c) => c.coverUrl));
    for (const cover of searchCovers) {
      if (!seen.has(cover.coverUrl)) {
        covers.push(cover);
        seen.add(cover.coverUrl);
      }
    }

    this.setCache(cacheKey, covers);
    return covers;
  }

  async getCoverByISBN(isbn: string): Promise<AlternativeCover[]> {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    const covers: AlternativeCover[] = [];

    // Validate ISBN format
    if (!isValidISBN(cleanIsbn)) {
      return covers;
    }

    try {
      // Check if cover exists via Open Library Covers API
      const coverUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-${COVER_SIZE}.jpg`;
      const checkResponse = await fetch(coverUrl, { method: 'HEAD' });
      const contentLength = parseInt(checkResponse.headers.get('content-length') || '0', 10);

      if (checkResponse.ok && contentLength > PLACEHOLDER_SIZE) {
        covers.push({
          isbn: cleanIsbn,
          coverUrl,
          editionTitle: undefined,
          year: undefined,
        });
      }

      // Also fetch edition details for more info
      const editionResponse = await fetch(
        `https://openlibrary.org/isbn/${cleanIsbn}.json`
      );

      if (editionResponse.ok) {
        const edition = (await editionResponse.json()) as OpenLibraryEdition;

        if (edition.covers && edition.covers.length > 0) {
          for (const coverId of edition.covers) {
            const url = `https://covers.openlibrary.org/b/id/${coverId}-${COVER_SIZE}.jpg`;
            if (!covers.some((c) => c.coverUrl === url)) {
              covers.push({
                isbn: cleanIsbn,
                coverUrl: url,
                editionTitle: edition.title,
                year: this.extractYear(edition.publish_date),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Open Library ISBN lookup failed:', error);
    }

    return covers;
  }

  private async searchByTitleAuthor(
    title: string,
    author?: string | null
  ): Promise<AlternativeCover[]> {
    const covers: AlternativeCover[] = [];

    try {
      // Build Lucene query for Open Library search
      const queryParts = [`title:"${title}"`];
      if (author) {
        queryParts.push(`author:"${author}"`);
      }

      const query = encodeURIComponent(queryParts.join(' '));
      const searchUrl = `https://openlibrary.org/search.json?q=${query}&fields=key,title,author_name,isbn,first_publish_year,cover_i,edition_key&limit=20`;
      const response = await fetch(searchUrl);

      if (!response.ok) {
        return covers;
      }

      const data = (await response.json()) as { docs?: OpenLibrarySearchDoc[] };
      const docs = data.docs || [];

      for (const doc of docs) {
        // Add cover from search result
        if (doc.cover_i) {
          covers.push({
            isbn: doc.isbn?.[0],
            coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-${COVER_SIZE}.jpg`,
            editionTitle: doc.title,
            year: doc.first_publish_year?.toString(),
          });
        }

        // Fetch some editions for this work to get more cover options
        if (doc.edition_key && doc.edition_key.length > 0) {
          const editionCovers = await this.fetchEditionCovers(
            doc.edition_key.slice(0, 5) // Limit to 5 editions per work
          );
          covers.push(...editionCovers);
        }
      }
    } catch (error) {
      console.error('Open Library search failed:', error);
    }

    return covers;
  }

  private async fetchEditionCovers(
    editionKeys: string[]
  ): Promise<AlternativeCover[]> {
    const covers: AlternativeCover[] = [];

    for (const key of editionKeys) {
      try {
        const response = await fetch(`https://openlibrary.org/books/${key}.json`);
        if (!response.ok) continue;

        const edition = (await response.json()) as OpenLibraryEdition;

        if (edition.covers && edition.covers.length > 0) {
          const isbn = edition.isbn_13?.[0] || edition.isbn_10?.[0];
          for (const coverId of edition.covers.slice(0, 2)) {
            // Limit covers per edition
            covers.push({
              isbn,
              coverUrl: `https://covers.openlibrary.org/b/id/${coverId}-${COVER_SIZE}.jpg`,
              editionTitle: edition.title,
              year: this.extractYear(edition.publish_date),
            });
          }
        }
      } catch {
        // Skip failed edition fetches
      }
    }

    return covers;
  }

  async downloadCover(url: string): Promise<Buffer> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download cover: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private extractYear(publishDate?: string): string | undefined {
    if (!publishDate) return undefined;
    const match = publishDate.match(/\d{4}/);
    return match ? match[0] : undefined;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const openLibraryService = new OpenLibraryService();
