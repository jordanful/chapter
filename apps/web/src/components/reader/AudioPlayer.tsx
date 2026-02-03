'use client';

import { useEffect, useState } from 'react';
import { Menu } from '@base-ui/react/menu';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Gauge,
  Check,
  ArrowLeft,
  Menu as MenuIcon,
} from 'lucide-react';
import { useAudioPlayer, type AudioChunk } from '@/lib/hooks/use-audio-player';
import { ModeToggle, ReaderMode } from './ModeToggle';

interface AudioPlayerProps {
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  chunks: AudioChunk[];
  onPositionChange?: (position: number, chunkId?: string) => void;
  onChunkNeeded?: (chunkIndex: number) => Promise<void>;
  initialChunkId?: string;
  initialTime?: number;
  className?: string;
  // Navigation
  book?: any;
  currentChapter?: number;
  totalChapters?: number;
  onBack?: () => void;
  onToggleNav?: () => void;
  mode?: ReaderMode;
  onModeChange?: (mode: ReaderMode) => void;
}

export function AudioPlayer({
  bookId,
  chapterId,
  chapterTitle,
  chunks,
  onPositionChange,
  onChunkNeeded,
  initialChunkId,
  initialTime,
  className = '',
  book,
  currentChapter,
  totalChapters,
  onBack,
  onToggleNav,
  mode,
  onModeChange,
}: AudioPlayerProps) {
  const { state, controls } = useAudioPlayer({
    bookId,
    chapterId,
    chunks,
    onPositionChange,
    onChunkNeeded,
    initialChunkId,
    initialTime,
  });

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          controls.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          controls.seekChapter(Math.max(0, state.chapterCurrentTime - 10));
          break;
        case 'ArrowRight':
          e.preventDefault();
          controls.seekChapter(Math.min(state.chapterDuration, state.chapterCurrentTime + 10));
          break;
        case 'ArrowUp':
          e.preventDefault();
          controls.setVolume(Math.min(1, state.volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          controls.setVolume(Math.max(0, state.volume - 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [controls, state.chapterCurrentTime, state.chapterDuration, state.volume]);

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          if (currentScrollY < 50) {
            setIsVisible(true);
          } else if (currentScrollY < lastScrollY) {
            setIsVisible(true);
          } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
            setIsVisible(false);
          }

          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Show on touch (for mobile)
  useEffect(() => {
    const handleTouch = () => {
      setIsVisible(true);
      setTimeout(() => {
        if (window.scrollY > 100) {
          setIsVisible(false);
        }
      }, 3000);
    };

    document.addEventListener('touchstart', handleTouch, { passive: true });
    return () => document.removeEventListener('touchstart', handleTouch);
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Speed presets
  const speedPresets = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      } ${className}`}
    >
      {/* Refined gradient backdrop */}
      <div className="relative bg-gradient-to-b from-[hsl(var(--reader-bg))]/95 via-[hsl(var(--reader-bg))]/98 to-[hsl(var(--reader-bg))] backdrop-blur-2xl border-t border-[hsl(var(--reader-text))]/8">
        {/* Elegant top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--reader-accent))]/30 to-transparent" />

        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-5">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-8">
            {/* Left: Back button + Book info */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={onBack}
                className="group flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[hsl(var(--reader-text))]/5 hover:bg-[hsl(var(--reader-text))]/10 transition-all duration-300 hover:scale-105 active:scale-95 shrink-0"
                aria-label="Back to library"
              >
                <ArrowLeft className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] text-[hsl(var(--reader-text))]/60 group-hover:text-[hsl(var(--reader-text))] transition-colors duration-300" />
              </button>

              <div className="hidden sm:flex flex-col min-w-0 gap-1">
                <h1 className="text-base font-semibold truncate text-[hsl(var(--reader-text))] tracking-tight leading-none">
                  {book?.title}
                </h1>
                <p className="text-[13px] text-[hsl(var(--reader-text))]/50 font-medium tracking-wide leading-none">
                  Chapter {(currentChapter ?? 0) + 1} of {totalChapters}
                </p>
              </div>
            </div>

            {/* Center: Audio playback controls */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-3">
              <button
                onClick={() => controls.seekChapter(Math.max(0, state.chapterCurrentTime - 15))}
                className="group flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[hsl(var(--reader-text))]/5 hover:bg-[hsl(var(--reader-text))]/10 transition-all duration-300 hover:scale-105 active:scale-95"
                aria-label="Skip back 15 seconds"
              >
                <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--reader-text))]/60 group-hover:text-[hsl(var(--reader-text))] transition-colors duration-300" />
              </button>

              <button
                onClick={controls.togglePlay}
                disabled={state.isLoading}
                className="group flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[hsl(var(--reader-text))]/5 hover:bg-[hsl(var(--reader-text))]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95"
                aria-label={state.isPlaying ? 'Pause' : 'Play'}
              >
                {state.isPlaying ? (
                  <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-[hsl(var(--reader-text))]/70 group-hover:text-[hsl(var(--reader-text))] transition-colors duration-300 fill-current" />
                ) : (
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 text-[hsl(var(--reader-text))]/70 group-hover:text-[hsl(var(--reader-text))] transition-colors duration-300 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={() =>
                  controls.seekChapter(
                    Math.min(state.chapterDuration, state.chapterCurrentTime + 15)
                  )
                }
                className="group flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[hsl(var(--reader-text))]/5 hover:bg-[hsl(var(--reader-text))]/10 transition-all duration-300 hover:scale-105 active:scale-95"
                aria-label="Skip forward 15 seconds"
              >
                <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--reader-text))]/60 group-hover:text-[hsl(var(--reader-text))] transition-colors duration-300" />
              </button>

              {/* Time display - shows elapsed time only (total unknown during streaming) */}
              <div className="flex items-center justify-center min-w-[60px] sm:min-w-[70px] h-9 sm:h-11 px-2.5 sm:px-4 rounded-full bg-[hsl(var(--reader-text))]/5 border border-[hsl(var(--reader-text))]/8">
                <span className="text-xs sm:text-sm font-semibold text-[hsl(var(--reader-text))]/70 tabular-nums">
                  {formatTime(state.chapterCurrentTime)}
                </span>
              </div>
            </div>

            {/* Right: Speed + Mode toggle + Menu */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              <Menu.Root>
                <Menu.Trigger
                  render={
                    <button className="group flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[hsl(var(--reader-text))]/5 hover:bg-[hsl(var(--reader-text))]/10 transition-all duration-300 hover:scale-105 active:scale-95 flex-shrink-0" />
                  }
                >
                  <Gauge className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] text-[hsl(var(--reader-text))]/60 group-hover:text-[hsl(var(--reader-text))] transition-colors duration-300" />
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner sideOffset={12} style={{ zIndex: 9999 }}>
                    <Menu.Popup
                      className="rounded-xl bg-[hsl(var(--reader-bg))] border border-[hsl(var(--reader-text))]/10 shadow-2xl p-2 min-w-[120px]"
                      style={{ zIndex: 9999 }}
                    >
                      <div className="text-xs text-[hsl(var(--reader-text))]/50 font-semibold mb-2 px-3 tracking-wide">
                        SPEED
                      </div>
                      {speedPresets.map((speed) => (
                        <Menu.Item
                          key={speed}
                          onClick={() => controls.setSpeed(speed)}
                          className="flex items-center justify-between px-3 py-2.5 text-sm text-[hsl(var(--reader-text))] hover:bg-[hsl(var(--reader-text))]/5 rounded-lg cursor-pointer transition-colors duration-200"
                        >
                          <span className="font-medium">{speed}x</span>
                          {state.speed === speed && (
                            <Check className="w-4 h-4 text-[hsl(var(--reader-accent))]" />
                          )}
                        </Menu.Item>
                      ))}
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>

              <ModeToggle mode={mode || 'listening'} onModeChange={onModeChange || (() => {})} />

              <button
                onClick={onToggleNav}
                className="group flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[hsl(var(--reader-text))]/5 hover:bg-[hsl(var(--reader-text))]/10 transition-all duration-300 hover:scale-105 active:scale-95 flex-shrink-0"
                aria-label="Open menu"
              >
                <MenuIcon className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] text-[hsl(var(--reader-text))]/60 group-hover:text-[hsl(var(--reader-text))] transition-colors duration-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Subtle bottom shadow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--reader-text))]/5 to-transparent" />
      </div>
    </div>
  );
}
