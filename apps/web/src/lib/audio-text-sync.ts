/**
 * Audio Text Sync Utilities
 *
 * Estimates which word is currently being spoken based on audio playback position.
 */

export interface AudioChunk {
  id: string;
  startPosition: number;
  endPosition: number;
  audioDuration: number;
}

/**
 * Calculate the current character position in the chapter based on audio playback
 */
export function audioPositionToCharPosition(
  currentChunkId: string,
  currentTime: number,
  chunks: AudioChunk[]
): number {
  const currentChunk = chunks.find((c) => c.id === currentChunkId);
  if (!currentChunk) return 0;

  // Calculate progress through current chunk (0-1)
  const progressThroughChunk = Math.min(1, currentTime / currentChunk.audioDuration);

  // Calculate character position within chunk
  const chunkLength = currentChunk.endPosition - currentChunk.startPosition;
  const charsIntoChunk = Math.floor(progressThroughChunk * chunkLength);

  return currentChunk.startPosition + charsIntoChunk;
}

/**
 * Find the word index at a given character position in text
 */
export function charPositionToWordIndex(text: string, charPosition: number): number {
  // Split into words
  const words = text.split(/(\s+)/); // Keep whitespace as separate elements

  let currentPos = 0;
  for (let i = 0; i < words.length; i++) {
    const wordLength = words[i].length;
    if (currentPos + wordLength > charPosition) {
      return i;
    }
    currentPos += wordLength;
  }

  return words.length - 1;
}

/**
 * Get character ranges for each word in text
 */
export function getWordRanges(text: string): Array<{ start: number; end: number; text: string }> {
  const words = text.split(/(\s+)/);
  const ranges: Array<{ start: number; end: number; text: string }> = [];

  let currentPos = 0;
  for (const word of words) {
    ranges.push({
      start: currentPos,
      end: currentPos + word.length,
      text: word,
    });
    currentPos += word.length;
  }

  return ranges;
}

/**
 * Calculate which word should be highlighted based on audio position
 */
export function getCurrentWord(
  chapterText: string,
  currentChunkId: string,
  currentTime: number,
  chunks: AudioChunk[]
): { wordIndex: number; charPosition: number } {
  const charPosition = audioPositionToCharPosition(currentChunkId, currentTime, chunks);
  const wordIndex = charPositionToWordIndex(chapterText, charPosition);

  return { wordIndex, charPosition };
}
