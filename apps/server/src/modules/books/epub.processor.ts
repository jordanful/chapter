import crypto from 'crypto';
import path from 'path';
import { parseEPUB } from '@chapter/epub-parser';
import { tokenize, countWords } from '@chapter/utils';
import { prisma } from '../../core/database';
import { config } from '../../core/config';
import { saveFile } from '../../core/storage';

export class EPUBProcessor {
  async processEPUB(userId: string, epubBuffer: Buffer, filename: string): Promise<string> {
    // Calculate file hash for deduplication
    const fileHash = crypto.createHash('sha256').update(epubBuffer).digest('hex');

    // Check if book already exists
    let book = await prisma.book.findUnique({
      where: { fileHash },
    });

    if (book) {
      // Book exists, just link to user
      await this.linkBookToUser(userId, book.id);
      return book.id;
    }

    // Parse EPUB
    const structure = await parseEPUB(epubBuffer);

    // Save EPUB file
    const filePath = path.join(config.storage.booksPath, `${fileHash}.epub`);
    await saveFile(filePath, epubBuffer);

    // Save cover if available
    let coverPath: string | undefined;
    if (structure.metadata.coverData) {
      coverPath = path.join(config.storage.booksPath, `${fileHash}-cover.jpg`);
      await saveFile(coverPath, structure.metadata.coverData);
    }

    // Normalize author field (handle both string and object formats)
    const normalizeField = (field: any): string | undefined => {
      if (!field) return undefined;
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field._) return field._;
      return undefined;
    };

    // Create book in database
    book = await prisma.book.create({
      data: {
        title: normalizeField(structure.metadata.title) || 'Untitled',
        author: normalizeField(structure.metadata.author),
        isbn: normalizeField(structure.metadata.isbn),
        language: normalizeField(structure.metadata.language),
        publisher: normalizeField(structure.metadata.publisher),
        description: normalizeField(structure.metadata.description),
        coverPath,
        filePath,
        fileSize: epubBuffer.length,
        fileHash,
        epubMetadata: structure.metadata as any,
        totalWords: structure.totalWords,
        totalCharacters: structure.totalCharacters,
        totalChapters: structure.chapters.length,
      },
    });

    // Process chapters
    let globalCharPosition = 0;

    for (const chapterData of structure.chapters) {
      const startPosition = globalCharPosition;
      const endPosition = startPosition + chapterData.textContent.length;

      const chapter = await prisma.chapter.create({
        data: {
          bookId: book.id,
          index: chapterData.index,
          title: chapterData.title,
          href: chapterData.href,
          htmlContent: chapterData.htmlContent,
          textContent: chapterData.textContent,
          startPosition,
          endPosition,
          wordCount: countWords(chapterData.textContent),
          charCount: chapterData.textContent.length,
        },
      });

      // Split into paragraphs and tokenize
      await this.processParagraphs(chapter.id, chapterData.textContent, startPosition);

      globalCharPosition = endPosition;
    }

    // Link book to user
    await this.linkBookToUser(userId, book.id);

    return book.id;
  }

  private async processParagraphs(
    chapterId: string,
    chapterText: string,
    chapterStartPosition: number
  ): Promise<void> {
    // Split into paragraphs (by double newline or single newline)
    const paragraphs = chapterText.split(/\n+/).filter((p) => p.trim().length > 0);

    let paragraphStartInChapter = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const text = paragraphs[i];
      const tokens = tokenize(text);
      const globalStartPosition = chapterStartPosition + paragraphStartInChapter;
      const globalEndPosition = globalStartPosition + text.length;

      await prisma.paragraph.create({
        data: {
          chapterId,
          index: i,
          text,
          tokens: tokens as any,
          startPosition: globalStartPosition,
          endPosition: globalEndPosition,
          wordCount: tokens.filter((t) => t.type === 'word').length,
        },
      });

      // Move position forward (include paragraph text + newline separator)
      paragraphStartInChapter += text.length + 1; // +1 for newline
    }
  }

  private async linkBookToUser(userId: string, bookId: string): Promise<void> {
    // Check if already linked
    const existing = await prisma.userBook.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
    });

    if (!existing) {
      await prisma.userBook.create({
        data: {
          userId,
          bookId,
        },
      });
    }
  }
}

export const epubProcessor = new EPUBProcessor();
