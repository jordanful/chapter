import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api-client';

export function useTTS() {
  const { data: voices, isLoading: voicesLoading } = useQuery({
    queryKey: ['tts-voices'],
    queryFn: async () => apiClient.getVoices(),
  });

  const { data: health } = useQuery({
    queryKey: ['tts-health'],
    queryFn: async () => apiClient.getTTSHealth(),
    refetchInterval: 30000, // Check every 30 seconds
  });

  return {
    voices: voices || [],
    voicesLoading,
    isHealthy: health?.status === 'ok',
  };
}

export function useGenerateAudio() {
  const mutation = useMutation({
    mutationFn: async ({
      bookId,
      chapterId,
      voiceId,
      settings,
    }: {
      bookId: string;
      chapterId: string;
      voiceId: string;
      settings?: any;
    }) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tts/generate/${bookId}/${chapterId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('chapter_token')}`,
          },
          body: JSON.stringify({ voiceId, settings }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      return response.json();
    },
  });

  return {
    generate: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    error: mutation.error,
  };
}

export function useAudioChunks(bookId: string, chapterId: string) {
  return useQuery({
    queryKey: ['audio-chunks', bookId, chapterId],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tts/chapters/${bookId}/${chapterId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('chapter_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch audio chunks');
      }

      return response.json();
    },
    enabled: !!bookId && !!chapterId,
  });
}
