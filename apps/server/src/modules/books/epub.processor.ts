import crypto from 'crypto';
import path from 'path';
import { parseEPUB } from '@chapter/epub-parser';
import { tokenize, countWords } from '@chapter/utils';
import { prisma } from '../../core/database';
import { config } from '../../core/config';
import { saveFile } from '../../core/storage';

export class EPUBProcessor {
  async processEPUB(userId: string, epubBuffer: Buffer, filename: string): Promise<string> {
    const fileHash = crypto.createHash('sha256').update(epubBuffer).digest('hex');

    let book = await prisma.book.findUnique({
      where: { fileHash },
    });

    if (book) {
      await this.linkBookToUser(userId, book.id);
      return book.id;
    }

    const structure = await parseEPUB(epubBuffer);

    const filePath = path.join(config.storage.booksPath, `${fileHash}.epub`);
    await saveFile(filePath, epubBuffer);

    let coverPath: string | undefined;
    if (structure.metadata.coverData) {
      coverPath = path.join(config.storage.booksPath, `${fileHash}-cover.jpg`);
      await saveFile(coverPath, structure.metadata.coverData);
    }

    const normalizeField = (field: any): string | undefined => {
      if (!field) return undefined;
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field._) return field._;
      return undefined;
    };

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

      await this.processParagraphs(chapter.id, chapterData.textContent, startPosition);

      globalCharPosition = endPosition;
    }

    await this.linkBookToUser(userId, book.id);

    return book.id;
  }

  private async processParagraphs(
    chapterId: string,
    chapterText: string,
    chapterStartPosition: number
  ): Promise<void> {
    // Split into paragraphs on double newlines (paragraph boundaries)
    // Single newlines (from <br> tags) are kept within paragraphs
    const paragraphs = chapterText.split(/\n\n+/).filter((p) => p.trim().length > 0);

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

      paragraphStartInChapter += text.length + 1;
    }
  }

  private async linkBookToUser(userId: string, bookId: string): Promise<void> {
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
          tags: [],
        },
      });
    }
  }
}

export const epubProcessor = new EPUBProcessor();
