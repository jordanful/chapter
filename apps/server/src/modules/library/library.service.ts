import { prisma } from '../../core/database';
import { folderScannerService } from './folder-scanner.service';
import { epubProcessor } from '../books/epub.processor';
import { readFile } from '../../core/storage';
import { config } from '../../core/config';
import type { WatchedFolder, ScanResult } from '@chapter/types';

export class LibraryService {
  /**
   * Create a new watched folder
   */
  async createWatchedFolder(userId: string, path: string, name?: string): Promise<WatchedFolder> {
    // Check folder limit
    const existingCount = await prisma.watchedFolder.count({
      where: { userId },
    });

    if (existingCount >= config.library.maxWatchedFolders) {
      throw new Error(`Maximum of ${config.library.maxWatchedFolders} watched folders allowed`);
    }

    // Validate path
    const pathTest = await folderScannerService.testPath(path);
    if (!pathTest.accessible) {
      throw new Error(`Path not accessible: ${pathTest.error}`);
    }

    // Check for duplicate
    const existing = await prisma.watchedFolder.findUnique({
      where: {
        userId_path: {
          userId,
          path,
        },
      },
    });

    if (existing) {
      throw new Error('This folder is already being watched');
    }

    // Create watched folder
    const folder = await prisma.watchedFolder.create({
      data: {
        userId,
        path,
        name,
      },
    });

    return folder as WatchedFolder;
  }

  /**
   * Get all watched folders for a user
   */
  async getWatchedFolders(userId: string): Promise<WatchedFolder[]> {
    const folders = await prisma.watchedFolder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return folders as WatchedFolder[];
  }

  /**
   * Get a specific watched folder
   */
  async getWatchedFolder(userId: string, folderId: string): Promise<WatchedFolder> {
    const folder = await prisma.watchedFolder.findFirst({
      where: {
        id: folderId,
        userId,
      },
    });

    if (!folder) {
      throw new Error('Watched folder not found');
    }

    return folder as WatchedFolder;
  }

  /**
   * Update a watched folder
   */
  async updateWatchedFolder(
    userId: string,
    folderId: string,
    updates: { name?: string; isActive?: boolean }
  ): Promise<WatchedFolder> {
    // Verify ownership
    await this.getWatchedFolder(userId, folderId);

    const folder = await prisma.watchedFolder.update({
      where: { id: folderId },
      data: updates,
    });

    return folder as WatchedFolder;
  }

  /**
   * Delete a watched folder
   */
  async deleteWatchedFolder(userId: string, folderId: string): Promise<void> {
    // Verify ownership
    await this.getWatchedFolder(userId, folderId);

    await prisma.watchedFolder.delete({
      where: { id: folderId },
    });
  }

  /**
   * Scan a specific folder for EPUBs
   */
  async scanFolder(userId: string, folderId: string): Promise<ScanResult> {
    const folder = await this.getWatchedFolder(userId, folderId);

    if (!folder.isActive) {
      throw new Error('Cannot scan inactive folder');
    }

    // Update status to scanning
    await prisma.watchedFolder.update({
      where: { id: folderId },
      data: {
        lastScanStatus: 'scanning',
        lastScanError: null,
      },
    });

    try {
      // Scan folder
      const scanResult = await folderScannerService.scanFolder(folder.path);

      // Import found EPUBs
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [...scanResult.errors];

      for (const epubPath of scanResult.epubFiles) {
        try {
          const wasImported = await this.importEpubFromPath(userId, epubPath);
          if (wasImported) {
            imported++;
          } else {
            skipped++;
          }
        } catch (error) {
          errors.push(`Failed to import ${epubPath}: ${(error as Error).message}`);
        }
      }

      // Update folder with results
      await prisma.watchedFolder.update({
        where: { id: folderId },
        data: {
          lastScanAt: new Date(),
          lastScanStatus: errors.length > 0 ? 'error' : 'idle',
          lastScanError: errors.length > 0 ? errors.join('\n') : null,
          booksFound: scanResult.epubFiles.length,
          totalScans: { increment: 1 },
          booksImported: { increment: imported },
        },
      });

      return {
        folderId,
        status: errors.length > 0 ? 'error' : 'completed',
        booksFound: scanResult.epubFiles.length,
        booksImported: imported,
        booksSkipped: skipped,
        errors,
        duration: scanResult.duration,
      };
    } catch (error) {
      // Update status to error
      await prisma.watchedFolder.update({
        where: { id: folderId },
        data: {
          lastScanStatus: 'error',
          lastScanError: (error as Error).message,
          totalScans: { increment: 1 },
        },
      });

      throw error;
    }
  }

  /**
   * Scan all active folders for a user
   */
  async scanAllFolders(userId: string): Promise<ScanResult[]> {
    const folders = await prisma.watchedFolder.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    const results: ScanResult[] = [];

    for (const folder of folders) {
      try {
        const result = await this.scanFolder(userId, folder.id);
        results.push(result);
      } catch (error) {
        results.push({
          folderId: folder.id,
          status: 'error',
          booksFound: 0,
          booksImported: 0,
          booksSkipped: 0,
          errors: [(error as Error).message],
          duration: 0,
        });
      }
    }

    return results;
  }

  /**
   * Import an EPUB from a file path
   * Returns true if imported, false if already exists (skipped)
   */
  private async importEpubFromPath(userId: string, filePath: string): Promise<boolean> {
    // Read the file
    const epubBuffer = await readFile(filePath);

    // Calculate hash to check if already exists
    const crypto = await import('crypto');
    const fileHash = crypto.createHash('sha256').update(epubBuffer).digest('hex');

    // Check if book already exists
    const existingBook = await prisma.book.findUnique({
      where: { fileHash },
    });

    if (existingBook) {
      // Book exists, check if user already has it
      const existingUserBook = await prisma.userBook.findUnique({
        where: {
          userId_bookId: {
            userId,
            bookId: existingBook.id,
          },
        },
      });

      if (existingUserBook) {
        // User already has this book, skip
        return false;
      }

      // Link existing book to user
      await prisma.userBook.create({
        data: {
          userId,
          bookId: existingBook.id,
          tags: [],
        },
      });
      return true;
    }

    // New book, process it
    const filename = filePath.split('/').pop() || 'unknown.epub';
    await epubProcessor.processEPUB(userId, epubBuffer, filename);
    return true;
  }

  /**
   * Get scan status for a folder
   */
  async getFolderScanStatus(userId: string, folderId: string) {
    const folder = await this.getWatchedFolder(userId, folderId);

    return {
      folderId: folder.id,
      status: folder.lastScanStatus as 'idle' | 'scanning' | 'error',
      booksFound: folder.booksFound,
      lastScanAt: folder.lastScanAt,
      lastScanError: folder.lastScanError,
    };
  }
}

export const libraryService = new LibraryService();
