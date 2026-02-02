/**
 * Position Sync Utilities
 *
 * Converts between reading mode (scroll position) and audio mode (timestamp)
 * using character positions as the common language.
 */

export interface AudioChunk {
  id: string;
  startPosition: number;
  endPosition: number;
  audioDuration: number;
}

export interface Chapter {
  textContent: string;
}

/**
 * Convert scroll position (percentage) to character position in chapter
 */
export function scrollToCharPosition(
  scrollPercent: number,
  chapterText: string
): number {
  const totalChars = chapterText.length;
  return Math.floor((scrollPercent / 100) * totalChars);
}

/**
 * Convert character position to scroll percentage
 */
export function charPositionToScroll(
  charPosition: number,
  chapterText: string
): number {
  const totalChars = chapterText.length;
  if (totalChars === 0) return 0;
  return Math.min(100, (charPosition / totalChars) * 100);
}

/**
 * Find which audio chunk contains a given character position
 */
export function findChunkByCharPosition(
  charPosition: number,
  chunks: AudioChunk[]
): { chunk: AudioChunk; index: number } | null {
  const index = chunks.findIndex(
    (c) => charPosition >= c.startPosition && charPosition < c.endPosition
  );

  if (index === -1) {
    // If not found, return the last chunk (we might be at the end)
    if (chunks.length > 0 && charPosition >= chunks[chunks.length - 1].endPosition) {
      return { chunk: chunks[chunks.length - 1], index: chunks.length - 1 };
    }
    return null;
  }

  return { chunk: chunks[index], index };
}

/**
 * Calculate audio timestamp from character position within a chunk
 */
export function charPositionToTimestamp(
  charPosition: number,
  chunk: AudioChunk
): number {
  const charsIntoChunk = charPosition - chunk.startPosition;
  const chunkChars = chunk.endPosition - chunk.startPosition;

  if (chunkChars === 0) return 0;

  const progressThroughChunk = charsIntoChunk / chunkChars;
  return progressThroughChunk * chunk.audioDuration;
}

/**
 * Calculate character position from audio timestamp within a chunk
 */
export function timestampToCharPosition(
  timestamp: number,
  chunk: AudioChunk
): number {
  const progressThroughChunk = timestamp / chunk.audioDuration;
  const chunkChars = chunk.endPosition - chunk.startPosition;
  const charsIntoChunk = Math.floor(progressThroughChunk * chunkChars);

  return chunk.startPosition + charsIntoChunk;
}

/**
 * Convert reading position (scroll %) to audio position (chunk + timestamp)
 *
 * @returns { chunkId, chunkIndex, timestamp } or null if conversion fails
 */
export function readingToAudioPosition(
  scrollPercent: number,
  chapterText: string,
  audioChunks: AudioChunk[]
): { chunkId: string; chunkIndex: number; timestamp: number } | null {
  // 1. Convert scroll to character position
  const charPosition = scrollToCharPosition(scrollPercent, chapterText);

  // 2. Find which chunk contains this character
  const result = findChunkByCharPosition(charPosition, audioChunks);
  if (!result) return null;

  // 3. Calculate timestamp offset within chunk
  const timestamp = charPositionToTimestamp(charPosition, result.chunk);

  return {
    chunkId: result.chunk.id,
    chunkIndex: result.index,
    timestamp,
  };
}

/**
 * Convert audio position (chunk + timestamp) to reading position (scroll %)
 *
 * @returns scroll percentage (0-100)
 */
export function audioToReadingPosition(
  chunkId: string,
  timestamp: number,
  chapterText: string,
  audioChunks: AudioChunk[]
): number {
  // 1. Find the chunk
  const chunk = audioChunks.find((c) => c.id === chunkId);
  if (!chunk) return 0;

  // 2. Calculate character position from timestamp
  const charPosition = timestampToCharPosition(timestamp, chunk);

  // 3. Convert to scroll percentage
  return charPositionToScroll(charPosition, chapterText);
}
