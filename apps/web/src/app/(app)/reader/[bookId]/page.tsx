'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { useBook, useBookStructure, useChapter } from '@/lib/hooks/use-books';
import { useGenerateAudio, useAudioChunks, useGenerateChunk } from '@/lib/hooks/use-tts';
import { useProgress } from '@/lib/hooks/use-progress';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { ChapterNav } from '@/components/reader/chapter-nav';
import { AudioPlayer } from '@/components/reader/AudioPlayer';
import { ReaderMode } from '@/components/reader/ModeToggle';
import { ReadAlongView } from '@/components/reader/ReadAlongView';
import { UnifiedControls } from '@/components/reader/unified-controls';
import { readingToAudioPosition, audioToReadingPosition } from '@/lib/position-sync';

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: book, isLoading: bookLoading } = useBook(bookId);
  const { data: structure } = useBookStructure(bookId);

  const [currentChapter, setCurrentChapter] = useState(0);
  const [showNav, setShowNav] = useState(false);
  const [mode, setMode] = useState<ReaderMode>('reading');
  const [isProgressRestored, setIsProgressRestored] = useState(false);
  const [currentScrollProgress, setCurrentScrollProgress] = useState(0);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [currentAudioChunk, setCurrentAudioChunk] = useState<string | null>(null);

  const { progress, updateProgress, saveNow } = useProgress(bookId);
  const { data: chapter, isLoading: chapterLoading } = useChapter(bookId, currentChapter);
  const { generate, isGenerating } = useGenerateAudio();
  const { generateChunk } = useGenerateChunk();
  const { tts } = useSettingsStore();

  // Get chapter ID from structure
  const chapterId = structure?.chapters[currentChapter]?.id;
  const { data: audioChunks, refetch: refetchChunks } = useAudioChunks(bookId, chapterId || '');

  // Handle scroll progress updates (only in reading mode)
  const handleScrollProgress = useCallback(
    (percentage: number) => {
      setCurrentScrollProgress(percentage);
      // Only save scroll progress in reading mode - listening mode uses audio position
      if (mode === 'reading') {
        updateProgress({
          chapterIndex: currentChapter,
          chapterId: chapterId,
          scrollPosition: percentage,
          percentage:
            ((currentChapter + percentage / 100) / (structure?.chapters.length || 1)) * 100,
        });
      }
    },
    [currentChapter, chapterId, structure, updateProgress, mode]
  );

  const handlePositionChange = useCallback(
    (position: number, chunkId?: string) => {
      setCurrentAudioTime(position);
      if (chunkId) setCurrentAudioChunk(chunkId);

      updateProgress({
        chapterIndex: currentChapter,
        chapterId: chapterId,
        audioTimestamp: position,
        audioChunkId: chunkId,
      });
    },
    [currentChapter, chapterId, updateProgress]
  );

  // On-demand chunk generation when a chunk is needed but not yet generated
  const handleChunkNeeded = useCallback(
    async (chunkIndex: number) => {
      if (!chapterId) return;
      await generateChunk({
        bookId,
        chapterId,
        chunkIndex,
        voiceId: tts.voiceId,
        settings: { speed: tts.speed, temperature: tts.temperature },
      });
      await refetchChunks();
    },
    [bookId, chapterId, generateChunk, refetchChunks, tts.voiceId, tts.speed, tts.temperature]
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Restore progress on mount
  useEffect(() => {
    if (progress && !isProgressRestored) {
      setCurrentChapter(progress.chapterIndex);
      setCurrentScrollProgress(progress.scrollPosition || 0);
      const restoredMode = progress.mode === 'audio' ? 'listening' : 'reading';
      setMode(restoredMode);

      // Restore audio position if in listening mode
      if (restoredMode === 'listening' && progress.audioTimestamp !== undefined) {
        setCurrentAudioTime(progress.audioTimestamp);
        if (progress.audioChunkId) {
          setCurrentAudioChunk(progress.audioChunkId);
        }
      }

      setIsProgressRestored(true);
    }
  }, [progress, isProgressRestored]);

  // Save progress on unmount
  useEffect(() => {
    return () => {
      saveNow().catch(console.error);
    };
  }, [saveNow]);

  // Update document title with book name
  useEffect(() => {
    if (book?.title) {
      document.title = `${book.title} - Chapter`;
    }
    return () => {
      document.title = 'Chapter';
    };
  }, [book?.title]);

  // Initialize currentAudioChunk when chunks become available
  useEffect(() => {
    if (mode === 'listening' && audioChunks && audioChunks.length > 0 && !currentAudioChunk) {
      setCurrentAudioChunk(audioChunks[0].id);
    }
  }, [mode, audioChunks, currentAudioChunk]);

  // Generate audio when switching to listening mode
  useEffect(() => {
    const generateAudioIfNeeded = async () => {
      // Check if we need to generate: no chunks, or chunks use different voice
      const needsGeneration =
        !audioChunks ||
        audioChunks.length === 0 ||
        (audioChunks[0]?.voiceId && audioChunks[0].voiceId !== tts.voiceId);

      if (mode === 'listening' && chapterId && needsGeneration) {
        try {
          await generate({
            bookId,
            chapterId,
            voiceId: tts.voiceId,
            settings: {
              speed: tts.speed,
              temperature: tts.temperature,
            },
          });
          refetchChunks();
        } catch (error) {
          console.error('Failed to generate audio:', error);
          setMode('reading');
        }
      }
    };

    generateAudioIfNeeded();
  }, [
    mode,
    chapterId,
    audioChunks,
    generate,
    bookId,
    refetchChunks,
    tts.voiceId,
    tts.speed,
    tts.temperature,
  ]);

  // Poll for new chunks while in listening mode (background generation)
  useEffect(() => {
    if (mode !== 'listening' || !chapterId) return;

    let stableCount = 0;
    let lastChunkCount = audioChunks?.length || 0;

    const pollInterval = setInterval(() => {
      refetchChunks().then(() => {
        const currentCount = audioChunks?.length || 0;
        if (currentCount === lastChunkCount) {
          stableCount++;
          // Stop polling after chunk count is stable for 3 cycles (9 seconds)
          if (stableCount >= 3) {
            clearInterval(pollInterval);
          }
        } else {
          stableCount = 0;
          lastChunkCount = currentCount;
        }
      });
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [mode, chapterId, refetchChunks, audioChunks?.length]);

  if (authLoading || bookLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !book) {
    return null;
  }

  const goToPrevChapter = () => {
    if (currentChapter > 0) {
      const newChapter = currentChapter - 1;
      setCurrentChapter(newChapter);
      setCurrentScrollProgress(0);
      updateProgress({
        chapterIndex: newChapter,
        chapterId: structure?.chapters[newChapter]?.id,
        scrollPosition: 0,
        audioTimestamp: 0,
      });
    }
  };

  const goToNextChapter = () => {
    if (structure && currentChapter < structure.chapters.length - 1) {
      const newChapter = currentChapter + 1;
      setCurrentChapter(newChapter);
      setCurrentScrollProgress(0);
      updateProgress({
        chapterIndex: newChapter,
        chapterId: structure?.chapters[newChapter]?.id,
        scrollPosition: 0,
        audioTimestamp: 0,
      });
    }
  };

  const handleModeChange = (newMode: ReaderMode) => {
    const oldMode = mode;
    setMode(newMode);

    const chapterText = chapter?.paragraphs?.map((p: any) => p.text).join('\n\n') || '';

    if (newMode === 'listening' && oldMode === 'reading') {
      if (audioChunks && audioChunks.length > 0 && chapterText) {
        const audioPos = readingToAudioPosition(
          currentScrollProgress,
          chapterText,
          audioChunks.map((chunk: any) => ({
            id: chunk.id,
            startPosition: chunk.startPosition,
            endPosition: chunk.endPosition,
            audioDuration: chunk.audioDuration,
          }))
        );

        if (audioPos) {
          updateProgress({
            chapterIndex: currentChapter,
            chapterId: chapterId,
            mode: 'audio',
            audioTimestamp: audioPos.timestamp,
            audioChunkId: audioPos.chunkId,
          });
          return;
        }
      }
    } else if (newMode === 'reading' && oldMode === 'listening') {
      if (audioChunks && audioChunks.length > 0 && progress?.audioChunkId) {
        const scrollPos = audioToReadingPosition(
          progress.audioChunkId,
          progress.audioTimestamp || 0,
          chapterText,
          audioChunks.map((chunk: any) => ({
            id: chunk.id,
            startPosition: chunk.startPosition,
            endPosition: chunk.endPosition,
            audioDuration: chunk.audioDuration,
          }))
        );

        updateProgress({
          chapterIndex: currentChapter,
          chapterId: chapterId,
          mode: 'reading',
          scrollPosition: scrollPos,
        });
        return;
      }
    }

    updateProgress({
      chapterIndex: currentChapter,
      chapterId: chapterId,
      mode: newMode === 'reading' ? 'reading' : 'audio',
    });
  };

  const currentChapterData = structure?.chapters[currentChapter];

  const estimatedProgress = structure
    ? ((currentChapter + currentScrollProgress / 100) / structure.chapters.length) * 100
    : progress?.percentage || 0;

  return (
    <div className="min-h-screen bg-[hsl(var(--reader-bg))]">
      {showNav && structure && (
        <ChapterNav
          chapters={structure.chapters}
          currentChapter={currentChapter}
          onSelectChapter={(index) => {
            setCurrentChapter(index);
            setCurrentScrollProgress(0);
            setShowNav(false);
          }}
          onClose={() => setShowNav(false)}
        />
      )}

      {/* Unified reading content - same UI for both modes */}
      <div className="pb-24">
        <ReadAlongView
          chapter={chapter}
          isLoading={chapterLoading}
          onScrollProgress={handleScrollProgress}
        />
      </div>

      {/* In-place loading overlay for audio generation */}
      {isGenerating && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          {/* Dim backdrop */}
          <div className="absolute inset-0 bg-[hsl(var(--reader-bg))]/60 backdrop-blur-[2px] transition-opacity duration-300" />
          {/* Chiclet */}
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[hsl(var(--reader-bg))] backdrop-blur-xl border border-[hsl(var(--reader-text))]/10 shadow-2xl">
              <div className="w-5 h-5 border-2 border-[hsl(var(--reader-accent))]/20 border-t-[hsl(var(--reader-accent))] rounded-full animate-spin" />
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-[hsl(var(--reader-text))]">
                  Preparing audio...
                </p>
                <p className="text-xs text-[hsl(var(--reader-text))]/50">
                  This will only take a moment
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls - switch between reading and audio player */}
      {mode === 'reading' ? (
        <UnifiedControls
          book={book}
          currentChapter={currentChapter}
          totalChapters={structure?.chapters.length || 0}
          bookProgress={estimatedProgress}
          onBack={() => router.push('/library')}
          onToggleNav={() => setShowNav(!showNav)}
          onPrevChapter={goToPrevChapter}
          onNextChapter={goToNextChapter}
          hasPrev={currentChapter > 0}
          hasNext={structure ? currentChapter < structure.chapters.length - 1 : false}
          mode={mode}
          onModeChange={handleModeChange}
        />
      ) : audioChunks && audioChunks.length > 0 && !isGenerating ? (
        <AudioPlayer
          bookId={bookId}
          chapterId={chapterId || ''}
          chapterTitle={currentChapterData?.title || `Chapter ${currentChapter + 1}`}
          chunks={audioChunks}
          onPositionChange={handlePositionChange}
          onChunkNeeded={handleChunkNeeded}
          initialChunkId={currentAudioChunk || undefined}
          initialTime={currentAudioTime || undefined}
          book={book}
          currentChapter={currentChapter}
          totalChapters={structure?.chapters.length || 0}
          onBack={() => router.push('/library')}
          onToggleNav={() => setShowNav(!showNav)}
          mode={mode}
          onModeChange={handleModeChange}
        />
      ) : null}
    </div>
  );
}
