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
    await this.getBookById(userId, bookId);

    await prisma.userBook.delete({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
    });

    const remainingUsers = await prisma.userBook.count({
      where: { bookId },
    });

    if (remainingUsers === 0) {
      const book = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (book) {
        await deleteFile(book.filePath);
        if (book.coverPath) {
          await deleteFile(book.coverPath);
        }

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
    const book = await this.getBookById(userId, bookId);

    const coverBuffer = await openLibraryService.downloadCover(coverUrl);
    const extension = coverUrl.includes('.png') ? 'png' : 'jpg';
    const fileHash = path.basename(book.filePath, '.epub');
    const coverPath = path.join(path.dirname(book.filePath), `${fileHash}-cover.${extension}`);

    if (book.coverPath && book.coverPath !== coverPath) {
      await deleteFile(book.coverPath);
    }

    await saveFile(coverPath, coverBuffer);

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
    await this.getBookById(userId, bookId);

    const updateData: any = {};

    if (metadata.title !== undefined) updateData.title = metadata.title;
    if (metadata.author !== undefined) updateData.author = metadata.author;
    if (metadata.isbn !== undefined) updateData.isbn = metadata.isbn;
    if (metadata.publisher !== undefined) updateData.publisher = metadata.publisher;
    if (metadata.language !== undefined) updateData.language = metadata.language;
    if (metadata.description !== undefined) updateData.description = metadata.description;

    if (metadata.coverUrl) {
      await this.updateCoverFromOpenLibrary(userId, bookId, metadata.coverUrl);
    }

    await prisma.book.update({
      where: { id: bookId },
      data: updateData,
    });
  }

  async getMetadataStats(): Promise<{
    totalBooks: number;
    bloatedBooks: number;
    estimatedBloatMB: number;
  }> {
    const books = await prisma.book.findMany({
      select: { id: true, epubMetadata: true },
    });

    let bloatedBooks = 0;
    let estimatedBloatBytes = 0;

    for (const book of books) {
      const meta = book.epubMetadata as Record<string, unknown> | null;
      if (meta && 'coverData' in meta) {
        bloatedBooks++;
        const coverJson = JSON.stringify(meta.coverData);
        estimatedBloatBytes += Buffer.byteLength(coverJson, 'utf8');
      }
    }

    return {
      totalBooks: books.length,
      bloatedBooks,
      estimatedBloatMB: Math.round((estimatedBloatBytes / 1024 / 1024) * 10) / 10,
    };
  }

  async cleanMetadata(): Promise<{ cleaned: number }> {
    const books = await prisma.book.findMany({
      select: { id: true, epubMetadata: true },
    });

    let cleaned = 0;

    for (const book of books) {
      const meta = book.epubMetadata as Record<string, unknown> | null;
      if (meta && 'coverData' in meta) {
        const { coverData, ...rest } = meta;
        await prisma.book.update({
          where: { id: book.id },
          data: { epubMetadata: rest as any },
        });
        cleaned++;
      }
    }

    return { cleaned };
  }

  async setFavorite(userId: string, bookId: string, isFavorite: boolean): Promise<void> {
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
