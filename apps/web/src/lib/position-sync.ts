export interface AudioChunk {
  id: string;
  startPosition: number;
  endPosition: number;
  audioDuration: number;
}

export interface Chapter {
  textContent: string;
}

export function scrollToCharPosition(scrollPercent: number, chapterText: string): number {
  const totalChars = chapterText.length;
  return Math.floor((scrollPercent / 100) * totalChars);
}

export function charPositionToScroll(charPosition: number, chapterText: string): number {
  const totalChars = chapterText.length;
  if (totalChars === 0) return 0;
  return Math.min(100, (charPosition / totalChars) * 100);
}

export function findChunkByCharPosition(
  charPosition: number,
  chunks: AudioChunk[]
): { chunk: AudioChunk; index: number } | null {
  const index = chunks.findIndex(
    (c) => charPosition >= c.startPosition && charPosition < c.endPosition
  );

  if (index === -1) {
    if (chunks.length > 0 && charPosition >= chunks[chunks.length - 1].endPosition) {
      return { chunk: chunks[chunks.length - 1], index: chunks.length - 1 };
    }
    return null;
  }

  return { chunk: chunks[index], index };
}

export function charPositionToTimestamp(charPosition: number, chunk: AudioChunk): number {
  const charsIntoChunk = charPosition - chunk.startPosition;
  const chunkChars = chunk.endPosition - chunk.startPosition;

  if (chunkChars === 0) return 0;

  const progressThroughChunk = charsIntoChunk / chunkChars;
  return progressThroughChunk * chunk.audioDuration;
}

export function timestampToCharPosition(timestamp: number, chunk: AudioChunk): number {
  const progressThroughChunk = timestamp / chunk.audioDuration;
  const chunkChars = chunk.endPosition - chunk.startPosition;
  const charsIntoChunk = Math.floor(progressThroughChunk * chunkChars);

  return chunk.startPosition + charsIntoChunk;
}

export function readingToAudioPosition(
  scrollPercent: number,
  chapterText: string,
  audioChunks: AudioChunk[]
): { chunkId: string; chunkIndex: number; timestamp: number } | null {
  const charPosition = scrollToCharPosition(scrollPercent, chapterText);
  const result = findChunkByCharPosition(charPosition, audioChunks);
  if (!result) return null;
  const timestamp = charPositionToTimestamp(charPosition, result.chunk);

  return {
    chunkId: result.chunk.id,
    chunkIndex: result.index,
    timestamp,
  };
}

export function audioToReadingPosition(
  chunkId: string,
  timestamp: number,
  chapterText: string,
  audioChunks: AudioChunk[]
): number {
  const chunk = audioChunks.find((c) => c.id === chunkId);
  if (!chunk) return 0;
  const charPosition = timestampToCharPosition(timestamp, chunk);
  return charPositionToScroll(charPosition, chapterText);
}
