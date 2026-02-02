import { prisma } from '../../core/database';
import { epubProcessor } from './epub.processor';
import { readFile, deleteFile, saveFile } from '../../core/storage';
import { openLibraryService } from './open-library.service';
import type { AlternativeCover } from '@chapter/types';
import path from 'path';

export class BooksService {
  async uploadBook(userId: string, epubBuffer: Buffer, filename: string): Promise<any> {
    const bookId = await epubProcessor.processEPUB(userId, epubBuffer, filename);
    return await this.getBookById(userId, bookId);
  }

  async getUserBooks(userId: string): Promise<any[]> {
    const userBooks = await prisma.userBook.findMany({
      where: { userId },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            isbn: true,
            publisher: true,
            language: true,
            description: true,
            coverPath: true,
            filePath: true,
            fileSize: true,
            fileHash: true,
            epubMetadata: true,
            totalWords: true,
            totalCharacters: true,
            totalChapters: true,
            createdAt: true,
            updatedAt: true,
            readingProgress: {
              where: { userId },
              select: {
                lastReadAt: true,
                percentage: true,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        addedAt: 'desc',
      },
    });

    return userBooks.map((ub) => ({
      ...ub.book,
      isFavorite: ub.isFavorite,
      isArchived: ub.isArchived,
      rating: ub.rating,
      tags: ub.tags,
      addedAt: ub.addedAt,
      lastReadAt: ub.book.readingProgress[0]?.lastReadAt || null,
      progress: ub.book.readingProgress[0]?.percentage || 0,
    }));
  }

  async getBookById(userId: string, bookId: string): Promise<any> {
    const userBook = await prisma.userBook.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
      include: {
        book: true,
      },
    });

    if (!userBook) {
      throw new Error('Book not found');
    }

    return {
      ...userBook.book,
      isFavorite: userBook.isFavorite,
      isArchived: userBook.isArchived,
      rating: userBook.rating,
      tags: userBook.tags,
    };
  }

  async getBookStructure(userId: string, bookId: string): Promise<any> {
    // Verify user has access
    await this.getBookById(userId, bookId);

    const chapters = await prisma.chapter.findMany({
      where: { bookId },
      orderBy: { index: 'asc' },
      select: {
        id: true,
        index: true,
        title: true,
        href: true,
        wordCount: true,
        charCount: true,
        startPosition: true,
        endPosition: true,
      },
    });

    return { chapters };
  }

  async getChapter(userId: string, bookId: string, chapterIndex: number): Promise<any> {
    // Verify user has access
    await this.getBookById(userId, bookId);

    const chapter = await prisma.chapter.findUnique({
      where: {
        bookId_index: {
          bookId,
          index: chapterIndex,
        },
      },
      include: {
        paragraphs: {
          orderBy: { index: 'asc' },
        },
      },
    });

    if (!chapter) {
      throw new Error('Chapter not found');
    }

    return chapter;
  }

  async deleteBook(userId: string, bookId: string): Promise<void> {
    // Verify user has access
    await this.getBookById(userId, bookId);

    // Remove user-book link
    await prisma.userBook.delete({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
    });

    // Check if any other users have this book
    const remainingUsers = await prisma.userBook.count({
      where: { bookId },
    });

    // If no other users, delete the book and its files
    if (remainingUsers === 0) {
      const book = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (book) {
        // Delete files
        await deleteFile(book.filePath);
        if (book.coverPath) {
          await deleteFile(book.coverPath);
        }

        // Delete book (cascades to chapters, paragraphs, etc.)
        await prisma.book.delete({
          where: { id: bookId },
        });
      }
    }
  }

  async getCover(userId: string, bookId: string): Promise<Buffer | null> {
    const book = await this.getBookById(userId, bookId);

    if (!book.coverPath) {
      return null;
    }

    return await readFile(book.coverPath);
  }

  async getEpubFile(userId: string, bookId: string): Promise<{ buffer: Buffer; filename: string }> {
    const book = await this.getBookById(userId, bookId);

    if (!book.filePath) {
      throw new Error('EPUB file not found');
    }

    const buffer = await readFile(book.filePath);
    const filename = `${book.title || 'book'}.epub`;

    return { buffer, filename };
  }

  async getAlternativeCovers(userId: string, bookId: string): Promise<AlternativeCover[]> {
    const book = await this.getBookById(userId, bookId);

    return await openLibraryService.searchEditions(book.title, book.author, book.isbn);
  }

  async updateCoverFromOpenLibrary(
    userId: string,
    bookId: string,
    coverUrl: string
  ): Promise<void> {
    // Verify user has access
    const book = await this.getBookById(userId, bookId);

    // Download the cover image
    const coverBuffer = await openLibraryService.downloadCover(coverUrl);

    // Determine file extension from URL or default to jpg
    const extension = coverUrl.includes('.png') ? 'png' : 'jpg';

    // Use the book's fileHash to create a unique cover path
    // The filePath is like: {booksPath}/{fileHash}.epub
    // We want: {booksPath}/{fileHash}-cover.{ext}
    const fileHash = path.basename(book.filePath, '.epub');
    const coverPath = path.join(path.dirname(book.filePath), `${fileHash}-cover.${extension}`);

    // Delete old cover if it exists and is different
    if (book.coverPath && book.coverPath !== coverPath) {
      await deleteFile(book.coverPath);
    }

    // Save new cover
    await saveFile(coverPath, coverBuffer);

    // Update database
    await prisma.book.update({
      where: { id: bookId },
      data: { coverPath },
    });
  }

  async updateMetadata(
    userId: string,
    bookId: string,
    metadata: {
      title?: string;
      author?: string;
      isbn?: string;
      publisher?: string;
      language?: string;
      description?: string;
      publishedYear?: string;
      coverUrl?: string;
    }
  ): Promise<void> {
    // Verify user has access
    await this.getBookById(userId, bookId);

    const updateData: any = {};

    if (metadata.title !== undefined) updateData.title = metadata.title;
    if (metadata.author !== undefined) updateData.author = metadata.author;
    if (metadata.isbn !== undefined) updateData.isbn = metadata.isbn;
    if (metadata.publisher !== undefined) updateData.publisher = metadata.publisher;
    if (metadata.language !== undefined) updateData.language = metadata.language;
    if (metadata.description !== undefined) updateData.description = metadata.description;

    // If coverUrl is provided, download and save it
    if (metadata.coverUrl) {
      await this.updateCoverFromOpenLibrary(userId, bookId, metadata.coverUrl);
    }

    // Update book metadata
    await prisma.book.update({
      where: { id: bookId },
      data: updateData,
    });
  }

  async setFavorite(userId: string, bookId: string, isFavorite: boolean): Promise<void> {
    // Verify user has access and update favorite status
    await prisma.userBook.update({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
      data: { isFavorite },
    });
  }
}

export const booksService = new BooksService();
