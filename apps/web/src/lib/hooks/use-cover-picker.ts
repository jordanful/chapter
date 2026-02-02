import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';

export function useAlternativeCovers(bookId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['alternative-covers', bookId],
    queryFn: () => apiClient.getAlternativeCovers(bookId),
    enabled: !!bookId && enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useUpdateCover(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (coverUrl: string) => apiClient.updateBookCover(bookId, coverUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
    },
  });
}
