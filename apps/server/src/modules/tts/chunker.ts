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

export class TextChunker {
  private targetSize: number;
  private maxSize: number;
  private minSize: number;

  constructor(options: ChunkOptions = {}) {
    this.targetSize = options.targetSize || 800; // Smaller chunks for faster generation
    this.maxSize = options.maxSize || 1200;
    this.minSize = options.minSize || 400;
  }

  chunk(text: string, globalStartPosition: number = 0): TextChunk[] {
    const paragraphs = this.splitParagraphs(text);

    const chunks: TextChunk[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;
    let chunkStartPosition = globalStartPosition;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const paragraphLength = paragraph.length;

      if (paragraphLength > this.maxSize) {
        if (currentChunk.length > 0) {
          chunks.push(this.createChunk(chunks.length, currentChunk, chunkStartPosition));
          currentChunk = [];
          currentLength = 0;
          chunkStartPosition += this.calculateLength(currentChunk);
        }

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

        if (sentenceChunk.length > 0) {
          chunks.push(this.createChunk(chunks.length, sentenceChunk, chunkStartPosition));
          chunkStartPosition += this.calculateLength(sentenceChunk);
        }

        continue;
      }

      if (currentLength + paragraphLength > this.targetSize && currentChunk.length > 0) {
        chunks.push(this.createChunk(chunks.length, currentChunk, chunkStartPosition));
        chunkStartPosition += this.calculateLength(currentChunk);
        currentChunk = [];
        currentLength = 0;
      }

      currentChunk.push(paragraph);
      currentLength += paragraphLength;
    }

    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(chunks.length, currentChunk, chunkStartPosition));
    }

    return chunks;
  }

  private createChunk(index: number, paragraphs: string[], startPosition: number): TextChunk {
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

  private splitParagraphs(text: string): string[] {
    return text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  private splitSentences(text: string): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  private calculateLength(paragraphs: string[]): number {
    return paragraphs.reduce((sum, p) => sum + p.length + 2, 0);
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter((w) => w.length > 0).length;
  }

  private createHash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
  }
}

export function createCacheHash(text: string, voiceId: string, settings: any = {}): string {
  const combined = JSON.stringify({
    text,
    voiceId,
    speed: settings.speed || 1.0,
    temperature: settings.temperature || 0.7,
  });

  return crypto.createHash('sha256').update(combined).digest('hex');
}

export const chunker = new TextChunker();
