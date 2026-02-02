import fs from 'fs/promises';
import path from 'path';
import { config } from '../../core/config';

export interface ScanResult {
  epubFiles: string[];
  errors: string[];
  duration: number;
}

export class FolderScannerService {
  private readonly BLACKLISTED_PATHS = [
    '/etc',
    '/sys',
    '/proc',
    '/root',
    '/var/run',
    '/boot',
    '/dev',
    '/bin',
    '/sbin',
    '/usr/bin',
    '/usr/sbin',
  ];

  /**
   * Scan a folder for EPUB files recursively
   */
  async scanFolder(folderPath: string): Promise<ScanResult> {
    const startTime = Date.now();
    const epubFiles: string[] = [];
    const errors: string[] = [];

    try {
      // Validate path
      this.validatePath(folderPath);

      // Check if path exists
      try {
        const stats = await fs.stat(folderPath);
        if (!stats.isDirectory()) {
          throw new Error('Path is not a directory');
        }
      } catch (error) {
        throw new Error(`Cannot access path: ${(error as Error).message}`);
      }

      // Walk directory tree
      await this.walkDirectory(folderPath, epubFiles, errors, 0);
    } catch (error) {
      errors.push((error as Error).message);
    }

    const duration = Date.now() - startTime;
    return { epubFiles, errors, duration };
  }

  /**
   * Recursively walk directory and collect EPUB files
   */
  private async walkDirectory(
    dir: string,
    epubFiles: string[],
    errors: string[],
    depth: number
  ): Promise<void> {
    // Check depth limit
    if (depth > config.library.maxScanDepth) {
      return;
    }

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        try {
          if (entry.isDirectory()) {
            // Skip hidden directories
            if (entry.name.startsWith('.')) {
              continue;
            }

            // Recurse into subdirectory
            await this.walkDirectory(fullPath, epubFiles, errors, depth + 1);
          } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.epub')) {
            epubFiles.push(fullPath);
          }
        } catch (error) {
          // Log individual file/directory errors but continue scanning
          errors.push(`Error accessing ${fullPath}: ${(error as Error).message}`);
        }
      }
    } catch (error) {
      errors.push(`Error reading directory ${dir}: ${(error as Error).message}`);
    }
  }

  /**
   * Validate path for security
   */
  private validatePath(folderPath: string): void {
    // Must be absolute path
    if (!path.isAbsolute(folderPath)) {
      throw new Error('Path must be absolute');
    }

    // Normalize and resolve to prevent directory traversal
    const normalized = path.normalize(folderPath);
    const resolved = path.resolve(folderPath);

    // Check for directory traversal attempts
    if (normalized.includes('..') || resolved.includes('..')) {
      throw new Error('Invalid path: directory traversal not allowed');
    }

    // Check blacklisted paths
    for (const blacklisted of this.BLACKLISTED_PATHS) {
      if (normalized.startsWith(blacklisted)) {
        throw new Error(`Access to ${blacklisted} is not allowed`);
      }
    }

    // Ensure path doesn't escape the base paths
    // Allow paths under the app directory or explicit library paths
    const allowedBasePaths = [
      '/app',
      '/library',
      config.storage.booksPath,
      process.env.HOME,
    ].filter(Boolean);

    const isAllowed = allowedBasePaths.some((basePath) => {
      if (!basePath) return false;
      const normalizedBase = path.normalize(basePath as string);
      return normalized.startsWith(normalizedBase);
    });

    if (!isAllowed) {
      throw new Error('Path must be within allowed directories');
    }
  }

  /**
   * Test if a path is accessible
   */
  async testPath(folderPath: string): Promise<{ accessible: boolean; error?: string }> {
    try {
      this.validatePath(folderPath);
      const stats = await fs.stat(folderPath);
      if (!stats.isDirectory()) {
        return { accessible: false, error: 'Path is not a directory' };
      }
      return { accessible: true };
    } catch (error) {
      return { accessible: false, error: (error as Error).message };
    }
  }
}

export const folderScannerService = new FolderScannerService();
