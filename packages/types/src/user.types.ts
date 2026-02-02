export interface UserRegistration {
  email: string;
  password: string;
  name?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
}

import { KokoroVoice } from './tts.types';

export interface UserSettings {
  ttsVoiceId?: KokoroVoice;
  ttsSettings?: {
    speed?: number;
    temperature?: number;
  };
  readingSettings?: {
    fontSize?: number;
    fontFamily?: string;
    lineHeight?: number;
    theme?: 'light' | 'dark' | 'sepia';
    maxWidth?: number;
  };
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}
