import { describe, it, expect } from 'vitest';
import {
  calculatePercentage,
  calculateCharPosition,
  estimateWordTimestamps,
  audioTimestampToCharPosition,
  charPositionToAudioTimestamp,
  createPosition,
} from './progress-calculator';

describe('progress-calculator', () => {
  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(0, 100)).toBe(0);
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(100, 100)).toBe(100);
    });

    it('should handle zero total characters', () => {
      expect(calculatePercentage(10, 0)).toBe(0);
    });

    it('should clamp to 0-100 range', () => {
      expect(calculatePercentage(-10, 100)).toBe(0);
      expect(calculatePercentage(150, 100)).toBe(100);
    });

    it('should handle decimal values', () => {
      expect(calculatePercentage(33, 100)).toBe(33);
      expect(calculatePercentage(1, 3)).toBeCloseTo(33.33, 2);
    });
  });

  describe('calculateCharPosition', () => {
    it('should calculate global character position', () => {
      const chapterStart = 0;
      const paragraphStart = 100;
      const tokenStart = 10;

      expect(calculateCharPosition(chapterStart, paragraphStart, tokenStart)).toBe(110);
    });

    it('should handle zero offsets', () => {
      expect(calculateCharPosition(0, 0, 0)).toBe(0);
    });

    it('should handle large values', () => {
      expect(calculateCharPosition(10000, 500, 50)).toBe(10550);
    });
  });

  describe('estimateWordTimestamps', () => {
    it('should estimate word timestamps evenly', () => {
      const text = 'Hello world test';
      const duration = 3.0; // 3 seconds

      const timestamps = estimateWordTimestamps(text, duration);

      expect(timestamps).toHaveLength(3);
      expect(timestamps[0].word).toBe('Hello');
      expect(timestamps[0].start).toBe(0);
      expect(timestamps[0].end).toBe(1);

      expect(timestamps[1].word).toBe('world');
      expect(timestamps[1].start).toBe(1);
      expect(timestamps[1].end).toBe(2);

      expect(timestamps[2].word).toBe('test');
      expect(timestamps[2].start).toBe(2);
      expect(timestamps[2].end).toBe(3);
    });

    it('should handle single word', () => {
      const timestamps = estimateWordTimestamps('Hello', 1.0);

      expect(timestamps).toHaveLength(1);
      expect(timestamps[0].start).toBe(0);
      expect(timestamps[0].end).toBe(1);
    });

    it('should handle empty text', () => {
      const timestamps = estimateWordTimestamps('', 1.0);

      expect(timestamps).toHaveLength(0);
    });

    it('should handle multiple spaces', () => {
      const timestamps = estimateWordTimestamps('Hello  world', 2.0);

      // Should split by whitespace and filter empty strings
      expect(timestamps).toHaveLength(2);
    });
  });

  describe('audioTimestampToCharPosition', () => {
    it('should convert audio timestamp to character position', () => {
      const timestamp = 1.5; // 1.5 seconds into 3 second audio
      const audioDuration = 3.0;
      const chunkStart = 0;
      const chunkEnd = 100;

      const charPos = audioTimestampToCharPosition(
        timestamp,
        audioDuration,
        chunkStart,
        chunkEnd
      );

      // 1.5/3.0 = 0.5, so halfway through chunk
      expect(charPos).toBe(50);
    });

    it('should handle start of audio', () => {
      const charPos = audioTimestampToCharPosition(0, 3.0, 100, 200);

      expect(charPos).toBe(100);
    });

    it('should handle end of audio', () => {
      const charPos = audioTimestampToCharPosition(3.0, 3.0, 100, 200);

      expect(charPos).toBe(200);
    });
  });

  describe('charPositionToAudioTimestamp', () => {
    it('should convert character position to audio timestamp', () => {
      const charPosition = 50; // Halfway through chunk
      const chunkStart = 0;
      const chunkEnd = 100;
      const audioDuration = 3.0;

      const timestamp = charPositionToAudioTimestamp(
        charPosition,
        chunkStart,
        chunkEnd,
        audioDuration
      );

      // Halfway through chunk = halfway through audio
      expect(timestamp).toBe(1.5);
    });

    it('should handle start of chunk', () => {
      const timestamp = charPositionToAudioTimestamp(100, 100, 200, 3.0);

      expect(timestamp).toBe(0);
    });

    it('should handle end of chunk', () => {
      const timestamp = charPositionToAudioTimestamp(200, 100, 200, 3.0);

      expect(timestamp).toBe(3.0);
    });

    it('should clamp to audio duration', () => {
      // Position beyond chunk end
      const timestamp = charPositionToAudioTimestamp(300, 100, 200, 3.0);

      expect(timestamp).toBe(3.0);
    });

    it('should clamp to zero', () => {
      // Position before chunk start (shouldn't happen, but handle gracefully)
      const timestamp = charPositionToAudioTimestamp(50, 100, 200, 3.0);

      expect(timestamp).toBe(0);
    });
  });

  describe('createPosition', () => {
    it('should create a position object', () => {
      const position = createPosition(500, 2, 5, 10, 1000);

      expect(position).toEqual({
        chapterIndex: 2,
        paragraphIndex: 5,
        tokenIndex: 10,
        charPosition: 500,
        percentage: 50,
      });
    });

    it('should calculate percentage correctly', () => {
      const position = createPosition(250, 0, 0, 0, 1000);

      expect(position.percentage).toBe(25);
    });

    it('should handle zero character position', () => {
      const position = createPosition(0, 0, 0, 0, 1000);

      expect(position.percentage).toBe(0);
    });

    it('should handle completion', () => {
      const position = createPosition(1000, 10, 99, 999, 1000);

      expect(position.percentage).toBe(100);
    });
  });

  describe('audio-text synchronization', () => {
    it('should round-trip between audio and text positions', () => {
      const chunkStart = 0;
      const chunkEnd = 100;
      const audioDuration = 3.0;

      // Start with character position
      const originalCharPos = 50;

      // Convert to audio timestamp
      const timestamp = charPositionToAudioTimestamp(
        originalCharPos,
        chunkStart,
        chunkEnd,
        audioDuration
      );

      // Convert back to character position
      const resultCharPos = audioTimestampToCharPosition(
        timestamp,
        audioDuration,
        chunkStart,
        chunkEnd
      );

      expect(resultCharPos).toBe(originalCharPos);
    });

    it('should maintain precision within chunk', () => {
      const chunkStart = 1000;
      const chunkEnd = 2000;
      const audioDuration = 10.0;

      // Test multiple positions
      for (const charPos of [1000, 1250, 1500, 1750, 2000]) {
        const timestamp = charPositionToAudioTimestamp(
          charPos,
          chunkStart,
          chunkEnd,
          audioDuration
        );

        const resultCharPos = audioTimestampToCharPosition(
          timestamp,
          audioDuration,
          chunkStart,
          chunkEnd
        );

        expect(resultCharPos).toBe(charPos);
      }
    });
  });
});
