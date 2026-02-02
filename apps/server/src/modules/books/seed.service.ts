import fs from 'fs/promises';
import path from 'path';
import { epubProcessor } from './epub.processor';

export class SeedService {
  private readonly seedBooksPath = path.join(process.cwd(), 'seed-books');

  /**
   * Import all seed books for a new user
   */
  async seedBooksForUser(userId: string): Promise<void> {
    try {
      // Check if seed-books directory exists
      const dirExists = await this.directoryExists(this.seedBooksPath);
      if (!dirExists) {
        console.log('📚 No seed-books directory found, skipping seeding');
        return;
      }

      // Get all EPUB files
      const files = await fs.readdir(this.seedBooksPath);
      const epubFiles = files.filter((f) => f.toLowerCase().endsWith('.epub'));

      if (epubFiles.length === 0) {
        console.log('📚 No EPUB files found in seed-books, skipping seeding');
        return;
      }

      console.log(`📚 Importing ${epubFiles.length} seed books for new user ${userId}`);

      // Import each book
      for (const filename of epubFiles) {
        try {
          const filePath = path.join(this.seedBooksPath, filename);
          const buffer = await fs.readFile(filePath);
          await epubProcessor.processEPUB(userId, buffer, filename);
          console.log(`  ✓ Imported ${filename}`);
        } catch (error) {
          console.error(`  ✗ Failed to import ${filename}:`, error);
          // Continue with other books even if one fails
        }
      }

      console.log(`📚 Finished seeding books for user ${userId}`);
    } catch (error) {
      console.error('Failed to seed books:', error);
      // Don't throw - seeding failure shouldn't block user registration
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
}

export const seedService = new SeedService();
