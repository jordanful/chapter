export interface Position {
  chapterIndex: number;
  paragraphIndex: number;
  tokenIndex: number;
  charPosition: number; // Global character offset
  percentage: number; // 0-100
}

export interface AudioPosition {
  timestamp: number; // Seconds
  chunkId?: string;
}

export interface ReadingSession {
  startTime: Date;
  endTime: Date;
  duration: number; // Seconds
  mode: 'reading' | 'audiobook';
}

export type ReadingMode = 'reading' | 'audiobook';

export interface ProgressUpdate {
  position: Position;
  mode: ReadingMode;
  audioPosition?: AudioPosition;
  sessionTime?: number;
}
