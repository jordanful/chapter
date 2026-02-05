'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@base-ui/react/select';
import { Slider } from '@base-ui/react/slider';
import { useAuth } from '@/lib/hooks/use-auth';
import { useTTS } from '@/lib/hooks/use-tts';
import { useSettingsStore, type Theme, type FontSize } from '@/lib/stores/settings-store';
import { apiClient } from '@/lib/api-client';
import { LibraryFolders } from '@/components/library/library-folders';
import {
  ArrowLeft,
  Volume2,
  ChevronDown,
  Check,
  Sun,
  Moon,
  BookOpen,
  Trash2,
  Database,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const { voices, voicesLoading, isHealthy } = useTTS();
  const { theme, fontSize, tts, setTheme, setFontSize, setTTSSettings } = useSettingsStore();

  const [testingVoice, setTestingVoice] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [cacheStats, setCacheStats] = useState<{
    totalSizeMB: number;
    totalEntries: number;
  } | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [metadataStats, setMetadataStats] = useState<{
    totalBooks: number;
    bloatedBooks: number;
    estimatedBloatMB: number;
  } | null>(null);
  const [cleaningMetadata, setCleaningMetadata] = useState(false);
  const [metadataCleaned, setMetadataCleaned] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Load cache stats
  useEffect(() => {
    const loadCacheStats = async () => {
      try {
        const stats = await apiClient.getAudioCacheStats();
        setCacheStats({ totalSizeMB: stats.totalSizeMB, totalEntries: stats.totalEntries });
      } catch (error) {
        // Silently fail - cache stats are optional
      }
    };
    const loadMetadataStats = async () => {
      try {
        const stats = await apiClient.getMetadataStats();
        setMetadataStats(stats);
      } catch (error) {
        // Silently fail - stats are optional
      }
    };
    if (isAuthenticated) {
      loadCacheStats();
      loadMetadataStats();
    }
  }, [isAuthenticated]);

  const clearCache = async () => {
    setClearingCache(true);
    try {
      await apiClient.clearAudioCache();
      setCacheStats({ totalSizeMB: 0, totalEntries: 0 });
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setClearingCache(false);
    }
  };

  const cleanMetadata = async () => {
    setCleaningMetadata(true);
    try {
      await apiClient.cleanMetadata();
      setMetadataStats((prev) => (prev ? { ...prev, bloatedBooks: 0, estimatedBloatMB: 0 } : prev));
      setMetadataCleaned(true);
    } catch (error) {
      console.error('Failed to clean metadata:', error);
    } finally {
      setCleaningMetadata(false);
    }
  };

  const testVoice = async () => {
    if (!isHealthy) {
      setTestError('TTS service is offline. Start Kokoro to test voices.');
      return;
    }

    setTestingVoice(true);
    setTestError(null);

    try {
      const audioBlob = await apiClient.previewVoice(tts.voiceId, tts.speed, tts.temperature);
      const audioUrl = URL.createObjectURL(audioBlob);

      // Clean up previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      // Play the audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setTestingVoice(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setTestingVoice(false);
        setTestError('Failed to play audio');
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      setTestingVoice(false);
      const message = error instanceof Error ? error.message : 'Failed to test voice';
      // Provide more helpful error messages
      if (message.includes('Failed to generate')) {
        setTestError('TTS service error. Make sure Kokoro is running.');
      } else {
        setTestError(message);
      }
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const fontSizeOptions = [
    { label: 'Small', value: 'small' },
    { label: 'Medium', value: 'medium' },
    { label: 'Large', value: 'large' },
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#1a1410',
        backgroundImage: 'url(/wood.png)',
        backgroundRepeat: 'repeat',
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-to-b from-black/60 via-black/40 to-transparent backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-[1.5rem] md:px-[3rem] py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <ArrowLeft className="w-[18px] h-[18px]" />
              </button>
              <h1 className="text-lg font-semibold text-white/90">Settings</h1>
            </div>
            <button
              onClick={logout}
              className="h-10 px-5 rounded-full bg-white/5 hover:bg-white/10 text-white/90 text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          {/* Account Section */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-white/90">Account</h2>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-white/50">Email</p>
                  <p className="font-medium text-white/90">{user?.email}</p>
                </div>
                {user?.name && (
                  <div>
                    <p className="text-sm text-white/50">Name</p>
                    <p className="font-medium text-white/90">{user.name}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Library Section */}
          <section className="mb-8">
            <LibraryFolders />
          </section>

          {/* TTS Section */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-white/90">Text-to-Speech</h2>

            {/* TTS Health */}
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm">
                <div
                  className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`}
                />
                <span className="text-white/50">
                  Kokoro TTS: {isHealthy ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Voice Selection */}
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block text-white/90">Voice</label>
                {voicesLoading ? (
                  <p className="text-sm text-white/50">Loading voices...</p>
                ) : (
                  <Select.Root
                    value={tts.voiceId}
                    onValueChange={(value) => value && setTTSSettings({ voiceId: value })}
                  >
                    <Select.Trigger className="flex items-center justify-between w-full h-11 px-4 rounded-xl border border-white/20 bg-white/5 text-white/90 hover:bg-white/10 transition-colors">
                      <Select.Value placeholder="Select a voice" />
                      <Select.Icon>
                        <ChevronDown className="w-4 h-4 text-white/50" />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner sideOffset={4} className="z-50">
                        <Select.Popup className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl p-1 shadow-2xl">
                          {voices.map((voice: any) => (
                            <Select.Item
                              key={voice.id}
                              value={voice.id}
                              className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer outline-none text-white/90 data-[highlighted]:bg-white/10 transition-colors"
                            >
                              <Select.ItemText>
                                {voice.name} ({voice.accent === 'american' ? 'US' : 'UK'},{' '}
                                {voice.gender})
                              </Select.ItemText>
                              <Select.ItemIndicator>
                                <Check className="w-4 h-4 text-white" />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Popup>
                      </Select.Positioner>
                    </Select.Portal>
                  </Select.Root>
                )}
              </div>

              {/* Speed */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-white/90">Speed</label>
                  <span className="text-sm font-medium text-white">{tts.speed.toFixed(1)}x</span>
                </div>
                <Slider.Root
                  value={tts.speed}
                  onValueChange={(value) => setTTSSettings({ speed: value })}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  className="flex flex-col gap-2"
                >
                  <Slider.Control className="relative flex items-center h-5">
                    <Slider.Track className="h-2 w-full bg-white/20 rounded-full">
                      <Slider.Indicator className="h-full bg-white/70 rounded-full" />
                      <Slider.Thumb className="w-5 h-5 bg-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-white/50 cursor-grab active:cursor-grabbing" />
                    </Slider.Track>
                  </Slider.Control>
                </Slider.Root>
                <div className="flex justify-between text-xs text-white/50 mt-2">
                  <span>0.5x</span>
                  <span>1.0x</span>
                  <span>2.0x</span>
                </div>
              </div>

              {/* Temperature */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-white/90">Voice Variation</label>
                  <span className="text-sm font-medium text-white">
                    {tts.temperature.toFixed(1)}
                  </span>
                </div>
                <Slider.Root
                  value={tts.temperature}
                  onValueChange={(value) => setTTSSettings({ temperature: value })}
                  min={0.0}
                  max={1.0}
                  step={0.1}
                  className="flex flex-col gap-2"
                >
                  <Slider.Control className="relative flex items-center h-5">
                    <Slider.Track className="h-2 w-full bg-white/20 rounded-full">
                      <Slider.Indicator className="h-full bg-white/70 rounded-full" />
                      <Slider.Thumb className="w-5 h-5 bg-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-white/50 cursor-grab active:cursor-grabbing" />
                    </Slider.Track>
                  </Slider.Control>
                </Slider.Root>
                <div className="flex justify-between text-xs text-white/50 mt-2">
                  <span>Consistent</span>
                  <span>Natural</span>
                  <span>Variable</span>
                </div>
              </div>

              {/* Test Voice */}
              <div className="space-y-2">
                <button
                  onClick={testVoice}
                  disabled={testingVoice || !isHealthy}
                  className="w-full h-11 px-6 rounded-xl border border-white/20 bg-white/5 text-white/90 hover:bg-white/10 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  {testingVoice ? 'Playing...' : 'Test Voice'}
                </button>
                {testError && <p className="text-sm text-red-400 text-center">{testError}</p>}
              </div>

              {/* Saved Audio */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-white/90">Saved Audio</p>
                    <p className="text-xs text-white/50">
                      {cacheStats ? `${cacheStats.totalSizeMB} MB used` : 'Loading...'}
                    </p>
                  </div>
                  <button
                    onClick={clearCache}
                    disabled={clearingCache || !cacheStats || cacheStats.totalEntries === 0}
                    className="h-9 px-4 rounded-lg border border-white/20 bg-white/5 text-white/70 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:border-white/20 disabled:hover:text-white/70"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {clearingCache ? 'Clearing...' : 'Clear'}
                  </button>
                </div>
              </div>

              <hr className="border-white/10" />
            </div>
          </section>

          {/* Reading Section */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-white/90">Reading</h2>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block text-white/90">Font Size</label>
                <Select.Root
                  value={fontSize}
                  onValueChange={(value) => value && setFontSize(value as FontSize)}
                >
                  <Select.Trigger className="flex items-center justify-between w-full h-11 px-4 rounded-xl border border-white/20 bg-white/5 text-white/90 hover:bg-white/10 transition-colors">
                    <Select.Value placeholder="Select font size" />
                    <Select.Icon>
                      <ChevronDown className="w-4 h-4 text-white/50" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner sideOffset={4} className="z-50">
                      <Select.Popup className="rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl p-1 shadow-2xl">
                        {fontSizeOptions.map((option) => (
                          <Select.Item
                            key={option.value}
                            value={option.value}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer outline-none text-white/90 data-[highlighted]:bg-white/10 transition-colors"
                          >
                            <Select.ItemText>{option.label}</Select.ItemText>
                            <Select.ItemIndicator>
                              <Check className="w-4 h-4 text-white" />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-white/90">Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTheme('light')}
                    className={`h-11 px-4 rounded-xl border transition-colors font-medium flex items-center justify-center gap-2 ${
                      theme === 'light'
                        ? 'border-white bg-white/20 text-white'
                        : 'border-white/20 text-white/60 hover:bg-white/10 hover:text-white/90'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    Light
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`h-11 px-4 rounded-xl border transition-colors font-medium flex items-center justify-center gap-2 ${
                      theme === 'dark'
                        ? 'border-white bg-white/20 text-white'
                        : 'border-white/20 text-white/60 hover:bg-white/10 hover:text-white/90'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    Dark
                  </button>
                  <button
                    onClick={() => setTheme('sepia')}
                    className={`h-11 px-4 rounded-xl border transition-colors font-medium flex items-center justify-center gap-2 ${
                      theme === 'sepia'
                        ? 'border-white bg-white/20 text-white'
                        : 'border-white/20 text-white/60 hover:bg-white/10 hover:text-white/90'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Sepia
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Maintenance Section */}
          {metadataStats && metadataStats.bloatedBooks > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-white/90">Maintenance</h2>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="w-4 h-4 text-white/70" />
                      <p className="text-sm font-medium text-white/90">Database Cleanup</p>
                    </div>
                    <p className="text-xs text-white/50">
                      {metadataCleaned
                        ? 'Metadata cleaned successfully'
                        : `${metadataStats.bloatedBooks} of ${metadataStats.totalBooks} books have embedded cover images in metadata (~${metadataStats.estimatedBloatMB} MB). These are already saved as files and can be safely removed from the database.`}
                    </p>
                  </div>
                  {!metadataCleaned && (
                    <button
                      onClick={cleanMetadata}
                      disabled={cleaningMetadata}
                      className="ml-4 shrink-0 h-9 px-4 rounded-lg border border-white/20 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white/90 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cleaningMetadata ? 'Cleaning...' : 'Clean Up'}
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Info Section */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-white/90">About</h2>
            <div className="text-sm text-white/50 space-y-2">
              <p>
                <strong className="text-white/70">Chapter</strong> - Offline-first reading &
                audiobook app
              </p>
              <p>Version: 0.1.0</p>
              <p>
                TTS powered by{' '}
                <a
                  href="https://github.com/hexgrad/kokoro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-white hover:underline"
                >
                  Kokoro
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
