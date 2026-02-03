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

  async getOrGenerateAudio(options: GenerateAudioOptions): Promise<CachedAudio> {
    const contentHash = createCacheHash(options.text, options.voiceId, options.settings);

    const cached = await this.getCachedAudio(contentHash);
    if (cached) {
      await this.updateAccessTime(cached.id);
      return cached;
    }

    return await this.generateAndCache(options, contentHash);
  }

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

  private async generateAndCache(
    options: GenerateAudioOptions,
    contentHash: string
  ): Promise<CachedAudio> {
    const ttsResult = await kokoroService.generateSpeech({
      text: options.text,
      voiceId: options.voiceId,
      settings: options.settings,
    });

    const audioFileName = `${contentHash}.${ttsResult.format}`;
    const audioPath = path.join(this.cacheDir, audioFileName);
    await saveFile(audioPath, ttsResult.audioData);

    const audioSize = ttsResult.audioData.length;

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

    await this.evictIfNeeded();

    return {
      id: cached.id,
      audioPath: cached.audioPath,
      audioDuration: cached.audioDuration,
      audioSize: cached.audioSize,
      wordTimestamps: ttsResult.wordTimestamps,
    };
  }

  private async updateAccessTime(cacheId: string): Promise<void> {
    await prisma.tTSCache.update({
      where: { id: cacheId },
      data: {
        accessCount: { increment: 1 },
        lastAccessed: new Date(),
      },
    });
  }

  async getCacheSize(): Promise<number> {
    const result = await prisma.tTSCache.aggregate({
      _sum: {
        audioSize: true,
      },
    });

    return result._sum.audioSize || 0;
  }

  private async evictIfNeeded(): Promise<void> {
    const currentSize = await this.getCacheSize();

    if (currentSize <= this.maxCacheSize) {
      return;
    }

    const sizeToFree = currentSize - this.maxCacheSize;

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
        await deleteFile(entry.audioPath);
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

  async streamAudio(cacheId: string): Promise<Buffer> {
    const cached = await prisma.tTSCache.findUnique({
      where: { id: cacheId },
    });

    if (!cached) {
      throw new Error('Audio not found in cache');
    }

    await this.updateAccessTime(cacheId);

    return await readFile(cached.audioPath);
  }

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

    setImmediate(async () => {
      for (let i = 1; i < chunks.length; i++) {
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

  async generateChunkOnDemand(
    bookId: string,
    chapterId: string,
    chunk: TextChunk,
    voiceId: KokoroVoice,
    settings?: TTSSettings
  ): Promise<CachedAudio> {
    return this.getOrGenerateAudio({
      text: chunk.text,
      voiceId,
      settings,
      bookId,
      chapterId,
      startPosition: chunk.startPosition,
      endPosition: chunk.endPosition,
    });
  }

  async getCacheStats() {
    const totalEntries = await prisma.tTSCache.count();
    const totalSize = await this.getCacheSize();

    const recentEntries = await prisma.tTSCache.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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
