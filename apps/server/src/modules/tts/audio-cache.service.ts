import path from 'path';
import { prisma } from '../../core/database';
import { config } from '../../core/config';
import { saveFile, readFile, deleteFile, getFileSize } from '../../core/storage';
import { kokoroService } from './kokoro.service';
import { createCacheHash, TextChunk } from './chunker';
import type { KokoroVoice, TTSSettings } from '@chapter/types';

export interface GenerateAudioOptions {
  text: string;
  voiceId: KokoroVoice;
  settings?: TTSSettings;
  bookId: string;
  chapterId?: string;
  startPosition: number;
  endPosition: number;
}

export interface CachedAudio {
  id: string;
  audioPath: string;
  audioDuration: number;
  audioSize: number;
  wordTimestamps?: any[];
}

export class AudioCacheService {
  private cacheDir: string;
  private maxCacheSize: number;

  constructor() {
    this.cacheDir = config.storage.audioPath;
    this.maxCacheSize = config.storage.audioCacheMaxSize;
  }

  /**
   * Generate or retrieve cached audio for a text chunk
   */
  async getOrGenerateAudio(options: GenerateAudioOptions): Promise<CachedAudio> {
    const contentHash = createCacheHash(options.text, options.voiceId, options.settings);

    // Check cache
    const cached = await this.getCachedAudio(contentHash);
    if (cached) {
      // Update access time for LRU
      await this.updateAccessTime(cached.id);
      return cached;
    }

    // Generate new audio
    return await this.generateAndCache(options, contentHash);
  }

  /**
   * Check if audio exists in cache
   */
  private async getCachedAudio(contentHash: string): Promise<CachedAudio | null> {
    const cached = await prisma.tTSCache.findUnique({
      where: { contentHash },
    });

    if (!cached) {
      return null;
    }

    return {
      id: cached.id,
      audioPath: cached.audioPath,
      audioDuration: cached.audioDuration,
      audioSize: cached.audioSize,
      wordTimestamps: cached.wordTimestamps as any,
    };
  }

  /**
   * Generate audio and save to cache
   */
  private async generateAndCache(
    options: GenerateAudioOptions,
    contentHash: string
  ): Promise<CachedAudio> {
    // Generate audio via Kokoro
    const ttsResult = await kokoroService.generateSpeech({
      text: options.text,
      voiceId: options.voiceId,
      settings: options.settings,
    });

    // Save audio file
    const audioFileName = `${contentHash}.${ttsResult.format}`;
    const audioPath = path.join(this.cacheDir, audioFileName);
    await saveFile(audioPath, ttsResult.audioData);

    const audioSize = ttsResult.audioData.length;

    // Save to database
    const cached = await prisma.tTSCache.create({
      data: {
        contentHash,
        bookId: options.bookId,
        chapterId: options.chapterId,
        startPosition: options.startPosition,
        endPosition: options.endPosition,
        textContent: options.text,
        voiceId: options.voiceId,
        settings: options.settings as any,
        audioPath,
        audioFormat: ttsResult.format,
        audioSize,
        audioDuration: ttsResult.duration,
        wordTimestamps: ttsResult.wordTimestamps as any,
        accessCount: 1,
        lastAccessed: new Date(),
      },
    });

    // Check if we need to evict old entries
    await this.evictIfNeeded();

    return {
      id: cached.id,
      audioPath: cached.audioPath,
      audioDuration: cached.audioDuration,
      audioSize: cached.audioSize,
      wordTimestamps: ttsResult.wordTimestamps,
    };
  }

  /**
   * Update access time for LRU
   */
  private async updateAccessTime(cacheId: string): Promise<void> {
    await prisma.tTSCache.update({
      where: { id: cacheId },
      data: {
        accessCount: { increment: 1 },
        lastAccessed: new Date(),
      },
    });
  }

  /**
   * Get current cache size
   */
  async getCacheSize(): Promise<number> {
    const result = await prisma.tTSCache.aggregate({
      _sum: {
        audioSize: true,
      },
    });

    return result._sum.audioSize || 0;
  }

  /**
   * Evict old entries if cache exceeds max size
   */
  private async evictIfNeeded(): Promise<void> {
    const currentSize = await this.getCacheSize();

    if (currentSize <= this.maxCacheSize) {
      return;
    }

    const sizeToFree = currentSize - this.maxCacheSize;

    // Get least recently used entries
    const entriesToEvict = await prisma.tTSCache.findMany({
      orderBy: {
        lastAccessed: 'asc',
      },
      take: 100, // Process in batches
    });

    let freedSize = 0;

    for (const entry of entriesToEvict) {
      if (freedSize >= sizeToFree) {
        break;
      }

      try {
        // Delete audio file
        await deleteFile(entry.audioPath);

        // Delete database entry
        await prisma.tTSCache.delete({
          where: { id: entry.id },
        });

        freedSize += entry.audioSize;
      } catch (error) {
        console.error('Failed to evict cache entry:', error);
      }
    }

    console.log(`Evicted ${freedSize} bytes from TTS cache`);
  }

  /**
   * Stream audio file
   */
  async streamAudio(cacheId: string): Promise<Buffer> {
    const cached = await prisma.tTSCache.findUnique({
      where: { id: cacheId },
    });

    if (!cached) {
      throw new Error('Audio not found in cache');
    }

    // Update access time
    await this.updateAccessTime(cacheId);

    // Read and return audio file
    return await readFile(cached.audioPath);
  }

  /**
   * Generate audio for entire chapter
   */
  async generateChapterAudio(
    bookId: string,
    chapterId: string,
    chunks: TextChunk[],
    voiceId: KokoroVoice,
    settings?: TTSSettings
  ): Promise<CachedAudio[]> {
    const results: CachedAudio[] = [];

    if (chunks.length === 0) {
      return results;
    }

    // Generate first chunk immediately for fast playback start
    const firstChunk = chunks[0];
    const firstAudio = await this.getOrGenerateAudio({
      text: firstChunk.text,
      voiceId,
      settings,
      bookId,
      chapterId,
      startPosition: firstChunk.startPosition,
      endPosition: firstChunk.endPosition,
    });
    results.push(firstAudio);

    // Pre-generate next chunks in background (non-blocking)
    setImmediate(async () => {
      for (let i = 1; i < Math.min(4, chunks.length); i++) {
        try {
          await this.getOrGenerateAudio({
            text: chunks[i].text,
            voiceId,
            settings,
            bookId,
            chapterId,
            startPosition: chunks[i].startPosition,
            endPosition: chunks[i].endPosition,
          });
        } catch (error) {
          console.error(`Background generation failed for chunk ${i}:`, error);
        }
      }
    });

    return results;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    const totalEntries = await prisma.tTSCache.count();
    const totalSize = await this.getCacheSize();

    const recentEntries = await prisma.tTSCache.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    return {
      totalEntries,
      totalSize,
      totalSizeMB: Math.round(totalSize / 1024 / 1024),
      maxSize: this.maxCacheSize,
      maxSizeMB: Math.round(this.maxCacheSize / 1024 / 1024),
      utilizationPercent: Math.round((totalSize / this.maxCacheSize) * 100),
      recentEntries,
    };
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    const entries = await prisma.tTSCache.findMany();

    for (const entry of entries) {
      try {
        await deleteFile(entry.audioPath);
      } catch (error) {
        console.error('Failed to delete audio file:', error);
      }
    }

    await prisma.tTSCache.deleteMany();
  }
}

export const audioCacheService = new AudioCacheService();
