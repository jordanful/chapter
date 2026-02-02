'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { useBook, useBookStructure, useChapter } from '@/lib/hooks/use-books';
import { useGenerateAudio, useAudioChunks } from '@/lib/hooks/use-tts';
import { useProgress } from '@/lib/hooks/use-progress';
import { ReaderView } from '@/components/reader/reader-view';
import { ChapterNav } from '@/components/reader/chapter-nav';
import { AudioPlayer } from '@/components/reader/AudioPlayer';
import { ReaderMode } from '@/components/reader/ModeToggle';
import { ReadAlongView } from '@/components/reader/ReadAlongView';
import { UnifiedControls } from '@/components/reader/unified-controls';
import { readingToAudioPosition, audioToReadingPosition } from '@/lib/position-sync';
import { getCurrentWord } from '@/lib/audio-text-sync';

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

  // Get chapter ID from structure
  const chapterId = structure?.chapters[currentChapter]?.id;
  const { data: audioChunks, refetch: refetchChunks } = useAudioChunks(bookId, chapterId || '');

  // Callbacks (must be before any early returns)
  const handleScrollChange = useCallback((scrollPos: number) => {
    setCurrentScrollProgress(scrollPos);
    updateProgress({
      chapterIndex: currentChapter,
      chapterId: chapterId,
      scrollPosition: scrollPos,
    });
  }, [currentChapter, chapterId, updateProgress]);

  const handlePositionChange = useCallback((position: number, chunkId?: string) => {
    setCurrentAudioTime(position);
    if (chunkId) setCurrentAudioChunk(chunkId);

    updateProgress({
      chapterIndex: currentChapter,
      chapterId: chapterId,
      audioTimestamp: position,
      audioChunkId: chunkId,
    });
  }, [currentChapter, chapterId, updateProgress]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Restore progress on mount
  useEffect(() => {
    if (progress && !isProgressRestored) {
      setCurrentChapter(progress.chapterIndex);
      // Map database mode ('audio') to frontend mode ('listening')
      const restoredMode = progress.mode === 'audio' ? 'listening' : 'reading';
      setMode(restoredMode);
      setIsProgressRestored(true);
    }
  }, [progress, isProgressRestored]);

  // Save progress on unmount
  useEffect(() => {
    return () => {
      saveNow().catch(console.error);
    };
  }, [saveNow]);

  // Generate audio when switching to listening mode
  useEffect(() => {
    const generateAudioIfNeeded = async () => {
      if (mode === 'listening' && chapterId && (!audioChunks || audioChunks.length === 0)) {
        try {
          await generate({
            bookId,
            chapterId,
            voiceId: 'af_bella', // TODO: Get from user settings
            settings: {
              speed: 1.0,
              temperature: 0.7,
            },
          });
          // Refetch chunks after generation
          refetchChunks();
        } catch (error) {
          console.error('Failed to generate audio:', error);
          // Fall back to reading mode if generation fails
          setMode('reading');
        }
      }
    };

    generateAudioIfNeeded();
  }, [mode, chapterId, audioChunks, generate, bookId, refetchChunks]);

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
      window.scrollTo(0, 0);
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
      window.scrollTo(0, 0);
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

    // Get chapter text for position conversion
    const chapterText = chapter?.paragraphs?.map((p: any) => p.text).join('\n\n') || '';

    if (newMode === 'listening' && oldMode === 'reading') {
      // Convert reading position to audio position
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
      // Convert audio position to reading position
      if (audioChunks && audioChunks.length > 0 && chapterText && progress?.audioChunkId) {
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

        // Scroll to the position
        setTimeout(() => {
          const documentHeight = document.documentElement.scrollHeight;
          const windowHeight = window.innerHeight;
          const trackLength = documentHeight - windowHeight;
          if (trackLength > 0) {
            const scrollTop = (scrollPos / 100) * trackLength;
            window.scrollTo({ top: scrollTop, behavior: 'smooth' });
          }
        }, 100);
        return;
      }
    }

    // Fallback: just switch mode without position conversion
    updateProgress({
      chapterIndex: currentChapter,
      chapterId: chapterId,
      mode: newMode === 'reading' ? 'reading' : 'audio',
    });
  };

  const currentChapterData = structure?.chapters[currentChapter];

  // Calculate real-time book progress (rough estimate)
  const estimatedProgress = structure
    ? ((currentChapter + currentScrollProgress / 100) / structure.chapters.length) * 100
    : progress?.percentage || 0;

  return (
    <div className="min-h-screen bg-background">
      {showNav && structure && (
        <ChapterNav
          chapters={structure.chapters}
          currentChapter={currentChapter}
          onSelectChapter={(index) => {
            setCurrentChapter(index);
            setShowNav(false);
            window.scrollTo(0, 0);
          }}
          onClose={() => setShowNav(false)}
        />
      )}

      {/* Reading View */}
      {mode === 'reading' && (
        <>
          <ReaderView
            chapter={chapter}
            isLoading={chapterLoading}
            onPrevChapter={goToPrevChapter}
            onNextChapter={goToNextChapter}
            hasPrev={currentChapter > 0}
            hasNext={structure ? currentChapter < structure.chapters.length - 1 : false}
            onScrollChange={handleScrollChange}
            initialScrollPosition={progress?.scrollPosition}
            bookProgress={estimatedProgress}
          />
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
        </>
      )}

      {/* Listening View */}
      {mode === 'listening' && (
        <div className="min-h-screen pb-48 bg-[hsl(var(--reader-bg))]">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-[hsl(var(--reader-accent))]/20 border-t-[hsl(var(--reader-accent))] rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Generating audio...</p>
              <p className="text-xs text-muted-foreground">This may take a moment</p>
            </div>
          ) : audioChunks && audioChunks.length > 0 ? (
            <>
              {/* Read-along view with word highlighting */}
              <ReadAlongView
                chapter={chapter}
                currentWordIndex={
                  currentAudioChunk && chapter
                    ? getCurrentWord(
                        chapter.paragraphs?.map((p: any) => p.text).join('\n\n') || '',
                        currentAudioChunk,
                        currentAudioTime,
                        audioChunks.map((chunk: any) => ({
                          id: chunk.id,
                          startPosition: chunk.startPosition,
                          endPosition: chunk.endPosition,
                          audioDuration: chunk.audioDuration,
                        }))
                      ).wordIndex
                    : 0
                }
                isLoading={chapterLoading}
              />

              {/* Audio Player */}
              <AudioPlayer
                bookId={bookId}
                chapterId={chapterId || ''}
                chapterTitle={currentChapterData?.title || `Chapter ${currentChapter + 1}`}
                chunks={audioChunks}
                onPositionChange={handlePositionChange}
                book={book}
                currentChapter={currentChapter}
                totalChapters={structure?.chapters.length || 0}
                onBack={() => router.push('/library')}
                onToggleNav={() => setShowNav(!showNav)}
                mode={mode}
                onModeChange={handleModeChange}
              />
            </>
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground">No audio available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
