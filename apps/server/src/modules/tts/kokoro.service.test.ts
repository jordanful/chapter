import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KokoroService, KOKORO_VOICES } from './kokoro.service';

// Mock fetch
global.fetch = vi.fn();

describe('KokoroService', () => {
  let kokoroService: KokoroService;

  beforeEach(() => {
    kokoroService = new KokoroService();
    vi.clearAllMocks();
  });

  describe('generateSpeech', () => {
    it('should generate speech successfully', async () => {
      const mockAudioData = new ArrayBuffer(1000);
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(mockAudioData),
        headers: {
          get: (header: string) => {
            if (header === 'X-Audio-Duration') return '3.5';
            if (header === 'X-Sample-Rate') return '24000';
            return null;
          },
        },
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await kokoroService.generateSpeech({
        text: 'Hello, world!',
        voiceId: 'af_bella',
        settings: { speed: 1.0, temperature: 0.7 },
      });

      expect(result).toHaveProperty('audioData');
      expect(result).toHaveProperty('duration', 3.5);
      expect(result).toHaveProperty('format', 'wav');
      expect(result).toHaveProperty('sampleRate', 24000);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/synthesize'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Hello, world!'),
        })
      );
    });

    it('should use default settings if not provided', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        headers: {
          get: () => null,
        },
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await kokoroService.generateSpeech({
        text: 'Test',
        voiceId: 'af_bella',
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.speed).toBe(1.0);
      expect(requestBody.temperature).toBe(0.7);
    });

    it('should throw error if request fails', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(
        kokoroService.generateSpeech({
          text: 'Test',
          voiceId: 'af_bella',
        })
      ).rejects.toThrow('Kokoro TTS failed');
    });

    it('should estimate duration if header not provided', async () => {
      const audioSize = 48000 * 2 * 3 + 44; // 3 seconds of audio + WAV header
      const mockAudioData = new ArrayBuffer(audioSize);

      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(mockAudioData),
        headers: {
          get: () => null, // No duration header
        },
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await kokoroService.generateSpeech({
        text: 'Test',
        voiceId: 'af_bella',
      });

      // Duration should be estimated from audio size
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('getVoices', () => {
    it('should return list of available voices', () => {
      const voices = kokoroService.getVoices();

      expect(voices).toBeInstanceOf(Array);
      expect(voices.length).toBeGreaterThan(0);
      expect(voices[0]).toHaveProperty('id');
      expect(voices[0]).toHaveProperty('name');
      expect(voices[0]).toHaveProperty('language');
      expect(voices[0]).toHaveProperty('accent');
      expect(voices[0]).toHaveProperty('gender');
    });

    it('should include all expected voices', () => {
      const voices = kokoroService.getVoices();
      const voiceIds = voices.map((v) => v.id);

      expect(voiceIds).toContain('af_bella');
      expect(voiceIds).toContain('am_adam');
      expect(voiceIds).toContain('bf_emma');
      expect(voiceIds).toContain('bm');
    });
  });

  describe('healthCheck', () => {
    it('should return true if service is healthy', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      const isHealthy = await kokoroService.healthCheck();

      expect(isHealthy).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should return false if service is unhealthy', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
      });

      const isHealthy = await kokoroService.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('should return false if request fails', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const isHealthy = await kokoroService.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('isValidVoice', () => {
    it('should validate correct voice IDs', () => {
      expect(kokoroService.isValidVoice('af_bella')).toBe(true);
      expect(kokoroService.isValidVoice('am_adam')).toBe(true);
      expect(kokoroService.isValidVoice('bf_emma')).toBe(true);
      expect(kokoroService.isValidVoice('bm')).toBe(true);
    });

    it('should reject invalid voice IDs', () => {
      expect(kokoroService.isValidVoice('invalid')).toBe(false);
      expect(kokoroService.isValidVoice('')).toBe(false);
      expect(kokoroService.isValidVoice('af_invalid')).toBe(false);
    });
  });

  describe('KOKORO_VOICES', () => {
    it('should have correct voice definitions', () => {
      const bella = KOKORO_VOICES.find((v) => v.id === 'af_bella');

      expect(bella).toBeDefined();
      expect(bella?.name).toBe('Bella');
      expect(bella?.language).toBe('en-US');
      expect(bella?.accent).toBe('american');
      expect(bella?.gender).toBe('female');
    });

    it('should have both American and British voices', () => {
      const americanVoices = KOKORO_VOICES.filter((v) => v.accent === 'american');
      const britishVoices = KOKORO_VOICES.filter((v) => v.accent === 'british');

      expect(americanVoices.length).toBeGreaterThan(0);
      expect(britishVoices.length).toBeGreaterThan(0);
    });

    it('should have both male and female voices', () => {
      const maleVoices = KOKORO_VOICES.filter((v) => v.gender === 'male');
      const femaleVoices = KOKORO_VOICES.filter((v) => v.gender === 'female');

      expect(maleVoices.length).toBeGreaterThan(0);
      expect(femaleVoices.length).toBeGreaterThan(0);
    });
  });
});
