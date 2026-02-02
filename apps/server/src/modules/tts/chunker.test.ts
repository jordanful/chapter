import { describe, it, expect } from 'vitest';
import { TextChunker, createCacheHash } from './chunker';

describe('TextChunker', () => {
  describe('chunk', () => {
    it('should split text into chunks at paragraph boundaries', () => {
      const chunker = new TextChunker({ targetSize: 100 });
      const text = 'Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.';

      const chunks = chunker.chunk(text);

      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        expect(chunk).toHaveProperty('index');
        expect(chunk).toHaveProperty('text');
        expect(chunk).toHaveProperty('hash');
        expect(chunk).toHaveProperty('wordCount');
      });
    });

    it('should respect target size', () => {
      const chunker = new TextChunker({ targetSize: 50 });
      const text = 'a '.repeat(100); // 200 characters

      const chunks = chunker.chunk(text);

      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should handle very long paragraphs by splitting into sentences', () => {
      const chunker = new TextChunker({ targetSize: 100, maxSize: 200 });
      const longParagraph = 'Sentence one. '.repeat(50); // Very long

      const chunks = chunker.chunk(longParagraph);

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(chunk.text.length).toBeLessThanOrEqual(200);
      });
    });

    it('should create unique hashes for different chunks', () => {
      const chunker = new TextChunker({ targetSize: 50 });
      const text = 'Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.';

      const chunks = chunker.chunk(text);

      const hashes = chunks.map((c) => c.hash);
      const uniqueHashes = new Set(hashes);

      expect(uniqueHashes.size).toBe(hashes.length);
    });

    it('should calculate positions correctly', () => {
      const chunker = new TextChunker({ targetSize: 50 });
      const text = 'First.\n\nSecond.\n\nThird.';

      const chunks = chunker.chunk(text, 1000);

      expect(chunks[0].startPosition).toBe(1000);
      expect(chunks[0].endPosition).toBeGreaterThan(chunks[0].startPosition);

      if (chunks.length > 1) {
        expect(chunks[1].startPosition).toBeGreaterThanOrEqual(chunks[0].endPosition);
      }
    });

    it('should count words correctly', () => {
      const chunker = new TextChunker();
      const text = 'Hello world this is a test';

      const chunks = chunker.chunk(text);

      expect(chunks[0].wordCount).toBe(6);
    });

    it('should handle empty text', () => {
      const chunker = new TextChunker();
      const chunks = chunker.chunk('');

      expect(chunks).toHaveLength(0);
    });

    it('should handle single paragraph', () => {
      const chunker = new TextChunker();
      const text = 'Just one paragraph here.';

      const chunks = chunker.chunk(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(text);
    });

    it('should create chunks near target size', () => {
      const chunker = new TextChunker({ targetSize: 1000 });
      const paragraphs = Array(10)
        .fill('This is a test paragraph. '.repeat(20))
        .join('\n\n');

      const chunks = chunker.chunk(paragraphs);

      chunks.forEach((chunk) => {
        // Chunks should be reasonably close to target size
        expect(chunk.text.length).toBeGreaterThan(500);
        expect(chunk.text.length).toBeLessThan(4000);
      });
    });

    it('should preserve paragraph structure within chunks', () => {
      const chunker = new TextChunker({ targetSize: 200 });
      const text = 'Para 1.\n\nPara 2.\n\nPara 3.';

      const chunks = chunker.chunk(text);

      chunks.forEach((chunk) => {
        // Chunks should maintain paragraph separation
        expect(chunk.text).not.toContain('\n\n\n');
      });
    });
  });

  describe('createCacheHash', () => {
    it('should create consistent hashes for same input', () => {
      const hash1 = createCacheHash('Hello world', 'af_bella', { speed: 1.0 });
      const hash2 = createCacheHash('Hello world', 'af_bella', { speed: 1.0 });

      expect(hash1).toBe(hash2);
    });

    it('should create different hashes for different text', () => {
      const hash1 = createCacheHash('Hello world', 'af_bella');
      const hash2 = createCacheHash('Goodbye world', 'af_bella');

      expect(hash1).not.toBe(hash2);
    });

    it('should create different hashes for different voices', () => {
      const hash1 = createCacheHash('Hello', 'af_bella');
      const hash2 = createCacheHash('Hello', 'am_adam');

      expect(hash1).not.toBe(hash2);
    });

    it('should create different hashes for different settings', () => {
      const hash1 = createCacheHash('Hello', 'af_bella', { speed: 1.0 });
      const hash2 = createCacheHash('Hello', 'af_bella', { speed: 1.5 });

      expect(hash1).not.toBe(hash2);
    });

    it('should use default settings if not provided', () => {
      const hash1 = createCacheHash('Hello', 'af_bella');
      const hash2 = createCacheHash('Hello', 'af_bella', {});

      expect(hash1).toBe(hash2);
    });
  });

  describe('realistic scenarios', () => {
    it('should chunk a typical book chapter', () => {
      const chunker = new TextChunker();

      // Simulate a 5000-word chapter
      const chapter = Array(50)
        .fill(
          'This is a typical paragraph in a book. It contains several sentences that form a cohesive thought. The paragraph discusses important topics and advances the narrative. '
        )
        .join('\n\n');

      const chunks = chunker.chunk(chapter);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.length).toBeLessThan(10);

      // Verify no gaps in position tracking
      for (let i = 1; i < chunks.length; i++) {
        expect(chunks[i].startPosition).toBeGreaterThanOrEqual(
          chunks[i - 1].endPosition
        );
      }
    });

    it('should handle dialogue with many short paragraphs', () => {
      const chunker = new TextChunker({ targetSize: 500 });

      const dialogue = Array(30)
        .fill('"Hello," she said.\n\n"Goodbye," he replied.')
        .join('\n\n');

      const chunks = chunker.chunk(dialogue);

      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        expect(chunk.wordCount).toBeGreaterThan(0);
      });
    });

    it('should handle very long single sentence', () => {
      const chunker = new TextChunker({ targetSize: 1000, maxSize: 2000 });

      // Create a very long run-on sentence
      const longSentence = 'This is ' + 'a very long sentence that goes on and on '.repeat(100) + '.';

      const chunks = chunker.chunk(longSentence);

      // Should split even without paragraph boundaries
      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});
