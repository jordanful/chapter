'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@base-ui/react/select';
import { Slider } from '@base-ui/react/slider';
import { useAuth } from '@/lib/hooks/use-auth';
import { useTTS } from '@/lib/hooks/use-tts';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Volume2, ChevronDown, Check } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const { voices, voicesLoading, isHealthy } = useTTS();

  const [selectedVoice, setSelectedVoice] = useState('af_bella');
  const [speed, setSpeed] = useState(1.0);
  const [temperature, setTemperature] = useState(0.7);
  const [fontSize, setFontSize] = useState('medium');
  const [testingVoice, setTestingVoice] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const testVoice = async () => {
    setTestingVoice(true);
    // TODO: Implement voice test
    setTimeout(() => setTestingVoice(false), 2000);
  };

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Account Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Account</h2>
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
              {user?.name && (
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{user.name}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* TTS Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Text-to-Speech</h2>

          {/* TTS Health */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm">
              <div
                className={`w-2 h-2 rounded-full ${
                  isHealthy ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-muted-foreground">
                Kokoro TTS: {isHealthy ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Voice Selection */}
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Voice</label>
              {voicesLoading ? (
                <p className="text-sm text-muted-foreground">Loading voices...</p>
              ) : (
                <Select.Root
                  value={selectedVoice}
                  onValueChange={(value) => value && setSelectedVoice(value)}
                >
                  <Select.Trigger className="flex items-center justify-between w-full h-11 px-4 rounded-xl border border-input bg-background hover:bg-accent/50 transition-colors">
                    <Select.Value placeholder="Select a voice" />
                    <Select.Icon>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner sideOffset={4}>
                      <Select.Popup className="max-h-64 overflow-auto rounded-xl border border-border bg-popover p-1 shadow-xl">
                        {voices.map((voice: any) => (
                          <Select.Item
                            key={voice.id}
                            value={voice.id}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer outline-none data-[highlighted]:bg-accent transition-colors"
                          >
                            <Select.ItemText>
                              {voice.name} ({voice.accent === 'american' ? 'US' : 'UK'},{' '}
                              {voice.gender})
                            </Select.ItemText>
                            <Select.ItemIndicator>
                              <Check className="w-4 h-4 text-primary" />
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
                <label className="text-sm font-medium">Speed</label>
                <span className="text-sm font-medium text-primary">{speed.toFixed(1)}x</span>
              </div>
              <Slider.Root
                value={speed}
                onValueChange={setSpeed}
                min={0.5}
                max={2.0}
                step={0.1}
                className="flex flex-col gap-2"
              >
                <Slider.Control className="relative flex items-center h-5">
                  <Slider.Track className="h-2 w-full bg-muted rounded-full">
                    <Slider.Indicator className="h-full bg-primary rounded-full" />
                    <Slider.Thumb className="w-5 h-5 bg-white border-2 border-primary rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-grab active:cursor-grabbing" />
                  </Slider.Track>
                </Slider.Control>
              </Slider.Root>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>0.5x</span>
                <span>1.0x</span>
                <span>2.0x</span>
              </div>
            </div>

            {/* Temperature */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Voice Variation</label>
                <span className="text-sm font-medium text-primary">
                  {temperature.toFixed(1)}
                </span>
              </div>
              <Slider.Root
                value={temperature}
                onValueChange={setTemperature}
                min={0.0}
                max={1.0}
                step={0.1}
                className="flex flex-col gap-2"
              >
                <Slider.Control className="relative flex items-center h-5">
                  <Slider.Track className="h-2 w-full bg-muted rounded-full">
                    <Slider.Indicator className="h-full bg-primary rounded-full" />
                    <Slider.Thumb className="w-5 h-5 bg-white border-2 border-primary rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-grab active:cursor-grabbing" />
                  </Slider.Track>
                </Slider.Control>
              </Slider.Root>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>Consistent</span>
                <span>Natural</span>
                <span>Variable</span>
              </div>
            </div>

            {/* Test Voice */}
            <Button
              onClick={testVoice}
              disabled={testingVoice || !isHealthy}
              className="w-full"
              variant="outline"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              {testingVoice ? 'Testing...' : 'Test Voice'}
            </Button>
          </div>
        </section>

        {/* Reading Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Reading</h2>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Font Size</label>
              <Select.Root value={fontSize} onValueChange={(value) => value && setFontSize(value)}>
                <Select.Trigger className="flex items-center justify-between w-full h-11 px-4 rounded-xl border border-input bg-background hover:bg-accent/50 transition-colors">
                  <Select.Value placeholder="Select font size" />
                  <Select.Icon>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={4}>
                    <Select.Popup className="rounded-xl border border-border bg-popover p-1 shadow-xl">
                      {fontSizeOptions.map((option) => (
                        <Select.Item
                          key={option.value}
                          value={option.value}
                          className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer outline-none data-[highlighted]:bg-accent transition-colors"
                        >
                          <Select.ItemText>{option.label}</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check className="w-4 h-4 text-primary" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                <button className="h-11 px-4 rounded-xl border border-input hover:bg-accent/50 transition-colors font-medium">
                  Light
                </button>
                <button className="h-11 px-4 rounded-xl border border-input hover:bg-accent/50 transition-colors font-medium">
                  Dark
                </button>
                <button className="h-11 px-4 rounded-xl border border-input hover:bg-accent/50 transition-colors font-medium">
                  Sepia
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4">About</h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Chapter</strong> - Offline-first reading & audiobook app
            </p>
            <p>Version: 0.1.0</p>
            <p>
              TTS powered by{' '}
              <a
                href="https://github.com/hexgrad/kokoro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Kokoro
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
