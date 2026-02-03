import { useState, useRef, useEffect, useCallback } from 'react';

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
  // Chapter-level progress
  chapterCurrentTime: number;
  chapterDuration: number;
}

export interface UseAudioPlayerOptions {
  bookId: string;
  chapterId: string;
  chunks: AudioChunk[];
  onPositionChange?: (position: number, chunkId?: string) => void;
  onChunkChange?: (chunkIndex: number) => void;
  onChunkNeeded?: (chunkIndex: number) => Promise<void>;
  initialChunkId?: string;
  initialTime?: number;
}

interface DecodedChunk {
  index: number;
  buffer: AudioBuffer;
}

export function useAudioPlayer({
  bookId,
  chapterId,
  chunks,
  onPositionChange,
  onChunkChange,
  onChunkNeeded,
  initialChunkId,
  initialTime,
}: UseAudioPlayerOptions) {
  // Web Audio API refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const nextSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Decoded audio buffer cache
  const decodedBuffersRef = useRef<Map<number, AudioBuffer>>(new Map());
  const pendingDecodes = useRef<Set<number>>(new Set());

  // Playback tracking
  const playbackStartTimeRef = useRef<number>(0); // AudioContext time when playback started
  const chunkStartOffsetRef = useRef<number>(0); // Offset within current chunk when started
  const isPlayingRef = useRef<boolean>(false);
  const currentChunkIndexRef = useRef<number>(0);
  const pendingChunkRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasInitializedRef = useRef<boolean>(false);
  const chunksRef = useRef<AudioChunk[]>(chunks);

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
    chapterCurrentTime: 0,
    chapterDuration: 0,
  });

  // Keep chunks ref updated so closures always have latest
  useEffect(() => {
    chunksRef.current = chunks;
  }, [chunks]);

  // Calculate total chapter duration from all chunks
  const chapterDuration = chunks.reduce((total, chunk) => total + chunk.audioDuration, 0);

  // Calculate time elapsed before a chunk
  const getTimeBeforeChunk = useCallback(
    (chunkIndex: number) => {
      return chunks.slice(0, chunkIndex).reduce((total, chunk) => total + chunk.audioDuration, 0);
    },
    [chunks]
  );

  // Initialize AudioContext (must be done after user gesture)
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
    // Resume if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Fetch and decode a chunk
  const fetchAndDecodeChunk = useCallback(
    async (chunkIndex: number): Promise<AudioBuffer | null> => {
      // Return cached if available
      if (decodedBuffersRef.current.has(chunkIndex)) {
        return decodedBuffersRef.current.get(chunkIndex)!;
      }

      // Skip if already being decoded
      if (pendingDecodes.current.has(chunkIndex)) {
        // Wait for it to complete
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (decodedBuffersRef.current.has(chunkIndex)) {
              clearInterval(checkInterval);
              resolve(decodedBuffersRef.current.get(chunkIndex)!);
            }
          }, 50);
        });
      }

      const chunk = chunks[chunkIndex];
      if (!chunk) return null;

      const ctx = ensureAudioContext();
      pendingDecodes.current.add(chunkIndex);

      try {
        const response = await fetch(`${API_URL}/tts/audio/${chunk.id}`);
        if (!response.ok) throw new Error('Failed to fetch audio');

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        decodedBuffersRef.current.set(chunkIndex, audioBuffer);
        pendingDecodes.current.delete(chunkIndex);
        return audioBuffer;
      } catch (error) {
        pendingDecodes.current.delete(chunkIndex);
        console.error(`[AudioPlayer] Failed to decode chunk ${chunkIndex}:`, error);
        return null;
      }
    },
    [chunks, ensureAudioContext]
  );

  // Preload upcoming chunks
  const preloadChunks = useCallback(
    (fromIndex: number, count: number = 2) => {
      for (let i = fromIndex; i < Math.min(fromIndex + count, chunks.length); i++) {
        if (!decodedBuffersRef.current.has(i) && !pendingDecodes.current.has(i)) {
          fetchAndDecodeChunk(i);
        }
      }
    },
    [chunks.length, fetchAndDecodeChunk]
  );

  // Preload new chunks when they arrive during playback
  const prevChunkCountRef = useRef(chunks.length);
  useEffect(() => {
    if (chunks.length > prevChunkCountRef.current && isPlayingRef.current) {
      preloadChunks(currentChunkIndexRef.current + 1, 3);
    }
    prevChunkCountRef.current = chunks.length;
  }, [chunks.length, preloadChunks]);

  // Schedule a chunk for playback
  const scheduleChunk = useCallback(
    (chunkIndex: number, buffer: AudioBuffer, startOffset: number = 0, when: number = 0) => {
      const ctx = audioContextRef.current;
      const gainNode = gainNodeRef.current;
      if (!ctx || !gainNode) return null;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = state.speed;
      source.connect(gainNode);

      // Calculate actual start time
      const startTime = when || ctx.currentTime;

      source.start(startTime, startOffset);

      return { source, startTime, startOffset };
    },
    [state.speed]
  );

  // Play from a specific chunk and offset
  const playFromChunk = useCallback(
    async (chunkIndex: number, offsetWithinChunk: number = 0) => {
      const ctx = ensureAudioContext();

      // Stop current playback
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
        } catch (e) {
          // Ignore - might already be stopped
        }
        currentSourceRef.current = null;
      }
      if (nextSourceRef.current) {
        try {
          nextSourceRef.current.stop();
        } catch (e) {}
        nextSourceRef.current = null;
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      // Fetch and decode current chunk
      const buffer = await fetchAndDecodeChunk(chunkIndex);
      if (!buffer) {
        setState((prev) => ({ ...prev, isLoading: false, error: 'Failed to load audio' }));
        return;
      }

      // Schedule playback
      const scheduled = scheduleChunk(chunkIndex, buffer, offsetWithinChunk);
      if (!scheduled) return;

      currentSourceRef.current = scheduled.source;
      playbackStartTimeRef.current = scheduled.startTime;
      chunkStartOffsetRef.current = offsetWithinChunk;
      currentChunkIndexRef.current = chunkIndex;
      isPlayingRef.current = true;

      // Monitor AudioContext state changes - auto-resume if suspended
      if (ctx.onstatechange === null) {
        ctx.onstatechange = () => {
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
        };
      }

      // Handle chunk end - schedule next chunk
      scheduled.source.onended = () => {
        // Use ref to get latest chunks (not stale closure)
        const currentChunks = chunksRef.current;

        if (!isPlayingRef.current) {
          return;
        }

        const nextIndex = currentChunkIndexRef.current + 1;

        if (nextIndex < currentChunks.length) {
          // Move to next chunk
          currentChunkIndexRef.current = nextIndex;
          chunkStartOffsetRef.current = 0;
          playbackStartTimeRef.current = ctx.currentTime;

          // Play next chunk if we have it buffered
          const nextBuffer = decodedBuffersRef.current.get(nextIndex);

          if (nextBuffer) {
            const nextScheduled = scheduleChunk(nextIndex, nextBuffer, 0, ctx.currentTime);
            if (nextScheduled) {
              currentSourceRef.current = nextScheduled.source;
              nextScheduled.source.onended = scheduled.source.onended;
            }
          } else {
            // Need to load it - this will cause a gap
            playFromChunk(nextIndex, 0);
          }

          setState((prev) => ({
            ...prev,
            currentChunkIndex: nextIndex,
            currentTime: 0,
          }));
          onChunkChange?.(nextIndex);

          // Notify position change with new chunk ID
          const nextChunk = currentChunks[nextIndex];
          if (nextChunk && onPositionChange) {
            onPositionChange(0, nextChunk.id);
          }

          // Preload more chunks
          preloadChunks(nextIndex + 1, 2);
        } else {
          // End of available chunks
          isPlayingRef.current = false;
          setState((prev) => ({ ...prev, isPlaying: false }));
        }
      };

      setState((prev) => ({
        ...prev,
        isPlaying: true,
        isLoading: false,
        currentChunkIndex: chunkIndex,
        currentTime: offsetWithinChunk,
        duration: buffer.duration,
        chapterDuration,
      }));

      onChunkChange?.(chunkIndex);

      // Notify position change with chunk ID for word highlighting
      const currentChunk = chunks[chunkIndex];
      if (currentChunk && onPositionChange) {
        onPositionChange(offsetWithinChunk, currentChunk.id);
      }

      // Preload next chunks
      preloadChunks(chunkIndex + 1, 2);
    },
    [
      ensureAudioContext,
      fetchAndDecodeChunk,
      scheduleChunk,
      chunks,
      chapterDuration,
      onChunkChange,
      onPositionChange,
      preloadChunks,
    ]
  );

  // Update time display using requestAnimationFrame
  useEffect(() => {
    const updateTime = () => {
      if (!isPlayingRef.current || !audioContextRef.current) {
        animationFrameRef.current = requestAnimationFrame(updateTime);
        return;
      }

      const ctx = audioContextRef.current;
      const chunkIndex = currentChunkIndexRef.current;
      const chunk = chunks[chunkIndex];

      if (!chunk || playbackStartTimeRef.current === 0) {
        animationFrameRef.current = requestAnimationFrame(updateTime);
        return;
      }

      // Calculate elapsed time - playbackRate handles speed, so we multiply by speed
      const elapsedReal = ctx.currentTime - playbackStartTimeRef.current;
      const elapsedAudio = elapsedReal * state.speed;

      // Clamp to valid range for this chunk
      const currentTime = Math.min(
        Math.max(0, chunkStartOffsetRef.current + elapsedAudio),
        chunk.audioDuration
      );

      const timeBeforeChunk = getTimeBeforeChunk(chunkIndex);
      const chapterCurrentTime = timeBeforeChunk + currentTime;

      setState((prev) => ({
        ...prev,
        currentTime,
        chapterCurrentTime,
        chapterDuration,
      }));

      if (onPositionChange) {
        onPositionChange(currentTime, chunk.id);
      }

      animationFrameRef.current = requestAnimationFrame(updateTime);
    };

    animationFrameRef.current = requestAnimationFrame(updateTime);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.speed, chunks, chapterDuration, getTimeBeforeChunk, onPositionChange]);

  // Toggle play/pause
  const togglePlay = useCallback(async () => {
    if (state.isPlaying) {
      // Pause
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
        } catch (e) {}
        currentSourceRef.current = null;
      }
      isPlayingRef.current = false;
      setState((prev) => ({ ...prev, isPlaying: false }));
    } else {
      // Resume from current position
      await playFromChunk(currentChunkIndexRef.current, state.currentTime);
    }
  }, [state.isPlaying, state.currentTime, playFromChunk]);

  // Seek within current chunk
  const seek = useCallback(
    (time: number) => {
      if (state.isPlaying) {
        playFromChunk(currentChunkIndexRef.current, time);
      } else {
        chunkStartOffsetRef.current = time;
        setState((prev) => ({ ...prev, currentTime: time }));
      }
    },
    [state.isPlaying, playFromChunk]
  );

  // Seek within entire chapter
  const seekChapter = useCallback(
    async (chapterTime: number) => {
      let accumulatedTime = 0;
      for (let i = 0; i < chunks.length; i++) {
        if (accumulatedTime + chunks[i].audioDuration > chapterTime) {
          const timeWithinChunk = chapterTime - accumulatedTime;
          if (state.isPlaying) {
            await playFromChunk(i, timeWithinChunk);
          } else {
            currentChunkIndexRef.current = i;
            chunkStartOffsetRef.current = timeWithinChunk;
            setState((prev) => ({
              ...prev,
              currentChunkIndex: i,
              currentTime: timeWithinChunk,
              chapterCurrentTime: chapterTime,
            }));
          }
          return;
        }
        accumulatedTime += chunks[i].audioDuration;
      }
    },
    [chunks, state.isPlaying, playFromChunk]
  );

  // Set playback speed
  const setSpeed = useCallback((speed: number) => {
    setState((prev) => ({ ...prev, speed }));
    if (currentSourceRef.current) {
      currentSourceRef.current.playbackRate.value = speed;
    }
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    setState((prev) => ({ ...prev, volume }));
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, []);

  // Navigation
  const nextChunk = useCallback(() => {
    if (currentChunkIndexRef.current < chunks.length - 1) {
      const nextIndex = currentChunkIndexRef.current + 1;
      if (state.isPlaying) {
        playFromChunk(nextIndex, 0);
      } else {
        currentChunkIndexRef.current = nextIndex;
        chunkStartOffsetRef.current = 0;
        setState((prev) => ({
          ...prev,
          currentChunkIndex: nextIndex,
          currentTime: 0,
        }));
      }
    }
  }, [chunks.length, state.isPlaying, playFromChunk]);

  const previousChunk = useCallback(() => {
    if (currentChunkIndexRef.current > 0) {
      const prevIndex = currentChunkIndexRef.current - 1;
      if (state.isPlaying) {
        playFromChunk(prevIndex, 0);
      } else {
        currentChunkIndexRef.current = prevIndex;
        chunkStartOffsetRef.current = 0;
        setState((prev) => ({
          ...prev,
          currentChunkIndex: prevIndex,
          currentTime: 0,
        }));
      }
    }
  }, [state.isPlaying, playFromChunk]);

  const loadChunk = useCallback(
    async (chunkIndex: number, autoPlay: boolean = false) => {
      if (!chunks[chunkIndex]) {
        if (onChunkNeeded) {
          setState((prev) => ({ ...prev, isLoading: true }));
          pendingChunkRef.current = chunkIndex;
          try {
            await onChunkNeeded(chunkIndex);
            return;
          } catch (error) {
            pendingChunkRef.current = null;
            setState((prev) => ({ ...prev, isLoading: false, error: 'Failed to load chunk' }));
            return;
          }
        }
        return;
      }

      if (autoPlay) {
        await playFromChunk(chunkIndex, 0);
      } else {
        currentChunkIndexRef.current = chunkIndex;
        chunkStartOffsetRef.current = 0;
        setState((prev) => ({
          ...prev,
          currentChunkIndex: chunkIndex,
          currentTime: 0,
        }));
        // Preload this chunk
        fetchAndDecodeChunk(chunkIndex);
      }
    },
    [chunks, onChunkNeeded, playFromChunk, fetchAndDecodeChunk]
  );

  // Handle pending chunk loads
  useEffect(() => {
    const pendingIndex = pendingChunkRef.current;
    if (pendingIndex !== null && chunks[pendingIndex]) {
      pendingChunkRef.current = null;
      loadChunk(pendingIndex);
    }
  }, [chunks, loadChunk]);

  // Reset when chapter changes
  const lastChapterIdRef = useRef<string>(chapterId);
  useEffect(() => {
    if (chapterId !== lastChapterIdRef.current) {
      lastChapterIdRef.current = chapterId;
      hasInitializedRef.current = false;

      // Stop current playback
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
        } catch (e) {}
        currentSourceRef.current = null;
      }
      isPlayingRef.current = false;
      currentChunkIndexRef.current = 0;
      chunkStartOffsetRef.current = 0;

      // Clear decoded buffers for old chapter
      decodedBuffersRef.current.clear();
      pendingDecodes.current.clear();

      setState((prev) => ({
        ...prev,
        isPlaying: false,
        currentChunkIndex: 0,
        currentTime: 0,
        chapterCurrentTime: 0,
      }));
    }
  }, [chapterId]);

  // Initial load - only run once when chunks first become available
  useEffect(() => {
    if (chunks.length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;

      let chunkIndex = 0;
      if (initialChunkId) {
        const foundIndex = chunks.findIndex((c) => c.id === initialChunkId);
        if (foundIndex !== -1) {
          chunkIndex = foundIndex;
        }
      }

      currentChunkIndexRef.current = chunkIndex;
      chunkStartOffsetRef.current = initialTime || 0;

      setState((prev) => ({
        ...prev,
        currentChunkIndex: chunkIndex,
        currentTime: initialTime || 0,
        chapterDuration,
      }));

      // Preload first few chunks
      preloadChunks(chunkIndex, 3);
    }
  }, [chunks, initialChunkId, initialTime, chapterDuration, preloadChunks]);

  // Update chapter duration when new chunks arrive
  useEffect(() => {
    if (chunks.length > 0) {
      setState((prev) => ({ ...prev, chapterDuration }));
    }
  }, [chunks.length, chapterDuration]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
        } catch (e) {}
        currentSourceRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  // Apply volume on mount
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = state.volume;
    }
  }, [state.volume]);

  return {
    state,
    controls: {
      togglePlay,
      seek,
      seekChapter,
      setSpeed,
      setVolume,
      nextChunk,
      previousChunk,
      loadChunk,
    },
  };
}
