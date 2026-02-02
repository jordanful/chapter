import { Position } from '@chapter/types';

/**
 * Calculate percentage through book based on character position
 */
export function calculatePercentage(charPosition: number, totalCharacters: number): number {
  if (totalCharacters === 0) return 0;
  return Math.min(100, Math.max(0, (charPosition / totalCharacters) * 100));
}

/**
 * Calculate global character position from chapter/paragraph/token indices
 */
export function calculateCharPosition(
  chapterStartPos: number,
  paragraphStartPos: number,
  tokenStartPos: number
): number {
  return chapterStartPos + paragraphStartPos + tokenStartPos;
}

/**
 * Estimate word timing based on audio duration and word count
 * Used when TTS provider doesn't provide word-level alignment
 */
export function estimateWordTimestamps(
  text: string,
  duration: number
): Array<{ word: string; start: number; end: number }> {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const timePerWord = duration / words.length;

  return words.map((word, index) => ({
    word,
    start: index * timePerWord,
    end: (index + 1) * timePerWord,
  }));
}

/**
 * Convert audio timestamp to approximate character position
 * Uses word count estimation when precise alignment is unavailable
 */
export function audioTimestampToCharPosition(
  timestamp: number,
  audioDuration: number,
  chunkStartPosition: number,
  chunkEndPosition: number
): number {
  const percentage = timestamp / audioDuration;
  const chunkLength = chunkEndPosition - chunkStartPosition;
  const offsetInChunk = Math.floor(chunkLength * percentage);
  return chunkStartPosition + offsetInChunk;
}

/**
 * Convert character position to audio timestamp
 * Uses linear interpolation based on position within chunk
 */
export function charPositionToAudioTimestamp(
  charPosition: number,
  chunkStartPosition: number,
  chunkEndPosition: number,
  audioDuration: number
): number {
  const chunkLength = chunkEndPosition - chunkStartPosition;
  const offsetInChunk = charPosition - chunkStartPosition;
  const percentage = offsetInChunk / chunkLength;
  return Math.max(0, Math.min(audioDuration, percentage * audioDuration));
}

/**
 * Create a position object from character offset
 */
export function createPosition(
  charPosition: number,
  chapterIndex: number,
  paragraphIndex: number,
  tokenIndex: number,
  totalCharacters: number
): Position {
  return {
    chapterIndex,
    paragraphIndex,
    tokenIndex,
    charPosition,
    percentage: calculatePercentage(charPosition, totalCharacters),
  };
}
