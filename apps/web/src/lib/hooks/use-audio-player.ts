import { useState, useRef, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface AudioChunk {
  id: string;
  index: number;
  startPosition: number;
  endPosition: number;
  audioDuration: number;
  audioSize: number;
  voiceId: string;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  isLoading: boolean;
  speed: number;
  volume: number;
  currentChunkIndex: number;
  error: string | null;
}

export interface UseAudioPlayerOptions {
  bookId: string;
  chapterId: string;
  chunks: AudioChunk[];
  onPositionChange?: (position: number, chunkId?: string) => void;
  onChunkChange?: (chunkIndex: number) => void;
}

export function useAudioPlayer({
  bookId,
  chapterId,
  chunks,
  onPositionChange,
  onChunkChange,
}: UseAudioPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    isLoading: false,
    speed: 1.0,
    volume: 1.0,
    currentChunkIndex: 0,
    error: null,
  });

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
      };
    }
  }, []);

  // Load chunk audio
  const loadChunk = useCallback(async (chunkIndex: number) => {
    if (!audioRef.current || !chunks[chunkIndex]) return;

    const chunk = chunks[chunkIndex];
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const audioUrl = `${API_URL}/tts/audio/${chunk.id}`;
      audioRef.current.src = audioUrl;
      await audioRef.current.load();

      setState(prev => ({
        ...prev,
        currentChunkIndex: chunkIndex,
        duration: chunk.audioDuration,
        isLoading: false,
      }));

      onChunkChange?.(chunkIndex);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load audio',
      }));
    }
  }, [chunks, onChunkChange]);

  // Play/Pause
  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return;

    if (state.isPlaying) {
      audioRef.current.pause();
    } else {
      try {
        await audioRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true }));
      } catch (error) {
        console.error('Playback error:', error);
      }
    }
  }, [state.isPlaying]);

  // Seek to time
  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);

  // Set speed
  const setSpeed = useCallback((speed: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = speed;
    setState(prev => ({ ...prev, speed }));
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    setState(prev => ({ ...prev, volume }));
  }, []);

  // Next chunk
  const nextChunk = useCallback(() => {
    if (state.currentChunkIndex < chunks.length - 1) {
      loadChunk(state.currentChunkIndex + 1);
    }
  }, [state.currentChunkIndex, chunks.length, loadChunk]);

  // Previous chunk
  const previousChunk = useCallback(() => {
    if (state.currentChunkIndex > 0) {
      loadChunk(state.currentChunkIndex - 1);
    }
  }, [state.currentChunkIndex, loadChunk]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));

      // Calculate global position
      const currentChunk = chunks[state.currentChunkIndex];
      if (currentChunk && onPositionChange) {
        const chunkProgress = audio.currentTime / currentChunk.audioDuration;
        const chunkLength = currentChunk.endPosition - currentChunk.startPosition;
        const position = currentChunk.startPosition + (chunkProgress * chunkLength);
        onPositionChange(audio.currentTime, currentChunk.id);
      }
    };

    const handleDurationChange = () => {
      setState(prev => ({ ...prev, duration: audio.duration }));
    };

    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        const buffered = audio.buffered.end(audio.buffered.length - 1);
        setState(prev => ({ ...prev, buffered }));
      }
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
      // Auto-play next chunk
      if (state.currentChunkIndex < chunks.length - 1) {
        nextChunk();
        setTimeout(() => {
          audio.play();
        }, 100);
      }
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleError = () => {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        error: 'Playback error occurred',
      }));
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [chunks, state.currentChunkIndex, onPositionChange, nextChunk]);

  // Load initial chunk
  useEffect(() => {
    if (chunks.length > 0 && !audioRef.current?.src) {
      loadChunk(0);
    }
  }, [chunks, loadChunk]);

  // Apply initial speed and volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = state.speed;
      audioRef.current.volume = state.volume;
    }
  }, [state.speed, state.volume]);

  return {
    state,
    controls: {
      togglePlay,
      seek,
      setSpeed,
      setVolume,
      nextChunk,
      previousChunk,
      loadChunk,
    },
  };
}
