// Kokoro TTS voices
export type KokoroVoice =
  | 'af' // Bella (American Female)
  | 'af_bella'
  | 'af_nicole'
  | 'af_sarah'
  | 'af_sky'
  | 'am' // Adam (American Male)
  | 'am_adam'
  | 'am_michael'
  | 'bf' // British Female
  | 'bf_emma'
  | 'bf_isabella'
  | 'bm'; // British Male

export interface Voice {
  id: KokoroVoice;
  name: string;
  language: string;
  accent: 'american' | 'british';
  gender: 'male' | 'female';
}

export interface TTSSettings {
  speed?: number; // 0.5 - 2.0 (Kokoro default: 1.0)
  temperature?: number; // 0.0 - 1.0 for voice variation
}

export interface WordTimestamp {
  word: string;
  start: number; // Seconds
  end: number; // Seconds
}

export interface TTSChunk {
  id: string;
  text: string;
  startPosition: number; // Global character offset
  endPosition: number;
  audioPath: string;
  duration: number; // Seconds
  wordTimestamps?: WordTimestamp[];
}

export interface TTSGenerateRequest {
  text: string;
  voiceId: KokoroVoice;
  settings?: TTSSettings;
}

export interface TTSGenerateResponse {
  audioData: Buffer;
  duration: number;
  format: 'wav' | 'mp3';
  sampleRate: number;
  wordTimestamps?: WordTimestamp[]; // Can be estimated from phoneme data
}
