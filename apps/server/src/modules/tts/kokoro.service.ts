import { config } from '../../core/config';
import { TTSGenerateRequest, TTSGenerateResponse, Voice, KokoroVoice } from '@chapter/types';

// Kokoro voice definitions
export const KOKORO_VOICES: Voice[] = [
  { id: 'af_bella', name: 'Bella', language: 'en-US', accent: 'american', gender: 'female' },
  { id: 'af_nicole', name: 'Nicole', language: 'en-US', accent: 'american', gender: 'female' },
  { id: 'af_sarah', name: 'Sarah', language: 'en-US', accent: 'american', gender: 'female' },
  { id: 'af_sky', name: 'Sky', language: 'en-US', accent: 'american', gender: 'female' },
  { id: 'am_adam', name: 'Adam', language: 'en-US', accent: 'american', gender: 'male' },
  { id: 'am_michael', name: 'Michael', language: 'en-US', accent: 'american', gender: 'male' },
  { id: 'bf_emma', name: 'Emma', language: 'en-GB', accent: 'british', gender: 'female' },
  { id: 'bf_isabella', name: 'Isabella', language: 'en-GB', accent: 'british', gender: 'female' },
  { id: 'bm', name: 'British Male', language: 'en-GB', accent: 'british', gender: 'male' },
];

export class KokoroService {
  private serviceUrl: string;

  constructor() {
    this.serviceUrl = config.tts.kokoroServiceUrl;
  }

  /**
   * Generate speech from text using Kokoro TTS
   */
  async generateSpeech(request: TTSGenerateRequest): Promise<TTSGenerateResponse> {
    try {
      const response = await fetch(`${this.serviceUrl}/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: request.text,
          voice: request.voiceId,
          speed: request.settings?.speed || 1.0,
          temperature: request.settings?.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Kokoro TTS failed: ${response.statusText}`);
      }

      const audioData = Buffer.from(await response.arrayBuffer());

      // Get duration from response headers if available
      const durationHeader = response.headers.get('X-Audio-Duration');
      const duration = durationHeader ? parseFloat(durationHeader) : this.estimateDuration(audioData);

      return {
        audioData,
        duration,
        format: 'wav',
        sampleRate: 24000, // Kokoro default
      };
    } catch (error) {
      console.error('Kokoro TTS error:', error);
      throw new Error(`Failed to generate speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get list of available voices
   */
  getVoices(): Voice[] {
    return KOKORO_VOICES;
  }

  /**
   * Check if Kokoro service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serviceUrl}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('Kokoro health check failed:', error);
      return false;
    }
  }

  /**
   * Estimate audio duration from WAV file size
   * This is a rough estimate based on typical WAV parameters
   */
  private estimateDuration(audioData: Buffer): number {
    // WAV format: 24kHz, 16-bit, mono
    // Bytes per second = sample_rate * (bits_per_sample / 8) * channels
    const bytesPerSecond = 24000 * 2 * 1; // 48000 bytes/sec

    // Subtract WAV header (typically 44 bytes)
    const dataSize = audioData.length - 44;

    return dataSize / bytesPerSecond;
  }

  /**
   * Validate voice ID
   */
  isValidVoice(voiceId: string): voiceId is KokoroVoice {
    return KOKORO_VOICES.some((v) => v.id === voiceId);
  }
}

export const kokoroService = new KokoroService();
