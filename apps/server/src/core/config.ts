import { config as dotenvConfig } from 'dotenv';
import path from 'path';

dotenvConfig();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://chapter:password@localhost:5432/chapter',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  storage: {
    booksPath: process.env.BOOK_STORAGE_PATH || path.join(process.cwd(), 'storage', 'books'),
    audioPath: process.env.AUDIO_CACHE_PATH || path.join(process.cwd(), 'storage', 'audio'),
    audioCacheMaxSize: parseInt(
      process.env.AUDIO_CACHE_MAX_SIZE || '10737418240',
      10
    ), // 10GB
  },

  tts: {
    kokoroServiceUrl: process.env.KOKORO_SERVICE_URL || 'http://kokoro:5000',
    defaultVoice: process.env.TTS_DEFAULT_VOICE || 'af_bella',
  },
};
