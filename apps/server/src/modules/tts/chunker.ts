import crypto from 'crypto';

export interface TextChunk {
  index: number;
  text: string;
  startPosition: number;
  endPosition: number;
  hash: string;
  wordCount: number;
}

export interface ChunkOptions {
  targetSize?: number; // Target characters per chunk (default: 3000)
  maxSize?: number; // Maximum characters per chunk (default: 4000)
  minSize?: number; // Minimum characters per chunk (default: 1000)
}

/**
 * Splits text into chunks optimized for TTS generation
 * - Respects paragraph boundaries
 * - Targets ~3000 characters per chunk
 * - Creates content hashes for caching
 */
export class TextChunker {
  private targetSize: number;
  private maxSize: number;
  private minSize: number;

  constructor(options: ChunkOptions = {}) {
    this.targetSize = options.targetSize || 800;  // Smaller chunks for faster generation
    this.maxSize = options.maxSize || 1200;
    this.minSize = options.minSize || 400;
  }

  /**
   * Split text into optimized chunks
   */
  chunk(text: string, globalStartPosition: number = 0): TextChunk[] {
    // Split into paragraphs
    const paragraphs = this.splitParagraphs(text);

    const chunks: TextChunk[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;
    let chunkStartPosition = globalStartPosition;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const paragraphLength = paragraph.length;

      // If single paragraph exceeds max size, split it
      if (paragraphLength > this.maxSize) {
        // Flush current chunk if any
        if (currentChunk.length > 0) {
          chunks.push(this.createChunk(chunks.length, currentChunk, chunkStartPosition));
          currentChunk = [];
          currentLength = 0;
          chunkStartPosition += this.calculateLength(currentChunk);
        }

        // Split large paragraph into sentences
        const sentences = this.splitSentences(paragraph);
        let sentenceChunk: string[] = [];
        let sentenceLength = 0;

        for (const sentence of sentences) {
          if (sentenceLength + sentence.length > this.maxSize && sentenceChunk.length > 0) {
            chunks.push(this.createChunk(chunks.length, sentenceChunk, chunkStartPosition));
            chunkStartPosition += this.calculateLength(sentenceChunk);
            sentenceChunk = [];
            sentenceLength = 0;
          }

          sentenceChunk.push(sentence);
          sentenceLength += sentence.length;
        }

        // Flush remaining sentences
        if (sentenceChunk.length > 0) {
          chunks.push(this.createChunk(chunks.length, sentenceChunk, chunkStartPosition));
          chunkStartPosition += this.calculateLength(sentenceChunk);
        }

        continue;
      }

      // Check if adding this paragraph would exceed target size
      if (currentLength + paragraphLength > this.targetSize && currentChunk.length > 0) {
        // Create chunk from accumulated paragraphs
        chunks.push(this.createChunk(chunks.length, currentChunk, chunkStartPosition));
        chunkStartPosition += this.calculateLength(currentChunk);
        currentChunk = [];
        currentLength = 0;
      }

      // Add paragraph to current chunk
      currentChunk.push(paragraph);
      currentLength += paragraphLength;
    }

    // Flush remaining paragraphs
    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(chunks.length, currentChunk, chunkStartPosition));
    }

    return chunks;
  }

  /**
   * Create a chunk object with metadata
   */
  private createChunk(
    index: number,
    paragraphs: string[],
    startPosition: number
  ): TextChunk {
    const text = paragraphs.join('\n\n');
    const hash = this.createHash(text);
    const wordCount = this.countWords(text);

    return {
      index,
      text,
      startPosition,
      endPosition: startPosition + text.length,
      hash,
      wordCount,
    };
  }

  /**
   * Split text into paragraphs
   */
  private splitParagraphs(text: string): string[] {
    return text
      .split(/\n{2,}/) // Split on 2+ newlines
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  /**
   * Split paragraph into sentences for very long paragraphs
   */
  private splitSentences(text: string): string[] {
    // Split on sentence boundaries (., !, ?)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  /**
   * Calculate total length of paragraph array
   */
  private calculateLength(paragraphs: string[]): number {
    return paragraphs.reduce((sum, p) => sum + p.length + 2, 0); // +2 for \n\n
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((w) => w.length > 0).length;
  }

  /**
   * Create content hash for caching
   */
  private createHash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
  }
}

/**
 * Create chunks with voice and settings for cache lookup
 */
export function createCacheHash(text: string, voiceId: string, settings: any = {}): string {
  const combined = JSON.stringify({
    text,
    voiceId,
    speed: settings.speed || 1.0,
    temperature: settings.temperature || 0.7,
  });

  return crypto.createHash('sha256').update(combined).digest('hex');
}

// Default chunker instance
export const chunker = new TextChunker();
