'use client';

import { useEffect, useState, useRef } from 'react';
import { Menu } from '@base-ui/react/menu';
import { Slider } from '@base-ui/react/slider';
import { Tooltip } from '@base-ui/react/tooltip';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Volume1,
  Gauge,
  Loader2,
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
  });

  const [isDragging, setIsDragging] = useState(false);
  const seekBarRef = useRef<HTMLDivElement>(null);
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
          controls.seek(Math.max(0, state.currentTime - 10));
          break;
        case 'ArrowRight':
          e.preventDefault();
          controls.seek(Math.min(state.duration, state.currentTime + 10));
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
  }, [controls, state.currentTime, state.duration, state.volume]);

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

  // Seek bar drag handling
  const handleSeekMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleSeekMove(e);
  };

  const handleSeekMove = (e: React.MouseEvent | MouseEvent) => {
    if (!seekBarRef.current) return;

    const rect = seekBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const time = percentage * state.duration;

    if (isDragging || e.type === 'mousedown') {
      controls.seek(time);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => handleSeekMove(e);
    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Format time
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = state.duration > 0
    ? (state.currentTime / state.duration) * 100
    : 0;

  const bufferedPercentage = state.duration > 0
    ? (state.buffered / state.duration) * 100
    : 0;

  // Speed presets
  const speedPresets = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  // Volume icon based on level
  const VolumeIcon = state.volume === 0 ? VolumeX : state.volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      } ${className}`}
    >
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-foreground/5">
        <div
          className="h-full bg-[hsl(var(--reader-accent))] transition-all"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Hidden seek bar */}
      <div
        ref={seekBarRef}
        className="absolute top-0 left-0 right-0 h-3 cursor-pointer opacity-0 hover:opacity-100 z-10"
        onMouseDown={handleSeekMouseDown}
      />

      <div className="bg-[hsl(var(--reader-bg))]/98 backdrop-blur-lg border-t border-border/50 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-[42rem] mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Left: Back + Book info */}
          {book && onBack && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-accent/50 h-7 w-7 flex-shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-[11px] font-serif font-medium truncate text-[hsl(var(--reader-text))] leading-tight">
                  {book.title}
                </h1>
                <p className="text-[9px] text-muted-foreground font-medium tracking-wide leading-tight truncate">
                  {chapterTitle}
                </p>
              </div>
            </div>
          )}

          {/* Center: Playback controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => controls.seek(Math.max(0, state.currentTime - 15))}
              className="hover:bg-accent/50 h-7 w-7"
            >
              <SkipBack className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={controls.togglePlay}
              disabled={state.isLoading}
              className="hover:bg-accent/50 h-8 w-8"
            >
              {state.isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => controls.seek(Math.min(state.duration, state.currentTime + 15))}
              className="hover:bg-accent/50 h-7 w-7"
            >
              <SkipForward className="w-3 h-3" />
            </Button>
            <div className="text-[9px] text-muted-foreground font-medium ml-1 min-w-[32px]">
              {formatTime(state.currentTime)}
            </div>
          </div>

          {/* Right: Speed + Mode + Menu */}
          <div className="flex items-center gap-1">
            <Menu.Root>
              <Menu.Trigger
                render={
                  <Button variant="ghost" size="icon" className="hover:bg-accent/50 h-7 w-7" />
                }
              >
                <Gauge className="w-3 h-3" />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={8} style={{ zIndex: 9999 }}>
                  <Menu.Popup className="rounded-lg bg-gray-900 p-2 shadow-xl min-w-[100px]" style={{ zIndex: 9999 }}>
                    <div className="text-[10px] text-gray-400 mb-1 px-2">Speed</div>
                    {speedPresets.map((speed) => (
                      <Menu.Item
                        key={speed}
                        onClick={() => controls.setSpeed(speed)}
                        className="flex items-center justify-between px-2 py-1.5 text-xs text-white hover:bg-gray-800 rounded cursor-pointer"
                      >
                        <span>{speed}x</span>
                        {state.speed === speed && <Check className="w-3 h-3" />}
                      </Menu.Item>
                    ))}
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            {mode && onModeChange && <ModeToggle mode={mode} onModeChange={onModeChange} />}
            {onToggleNav && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleNav}
                className="hover:bg-accent/50 h-7 w-7"
              >
                <MenuIcon className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
