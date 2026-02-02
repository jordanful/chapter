import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type {
  WatchedFolder,
  CreateWatchedFolderRequest,
  UpdateWatchedFolderRequest,
} from '@chapter/types';

export function useWatchedFolders() {
  return useQuery({
    queryKey: ['watched-folders'],
    queryFn: () => apiClient.getWatchedFolders(),
  });
}

export function useCreateWatchedFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWatchedFolderRequest) => apiClient.createWatchedFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watched-folders'] });
    },
  });
}

export function useUpdateWatchedFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ folderId, data }: { folderId: string; data: UpdateWatchedFolderRequest }) =>
      apiClient.updateWatchedFolder(folderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watched-folders'] });
    },
  });
}

export function useDeleteWatchedFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (folderId: string) => apiClient.deleteWatchedFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watched-folders'] });
    },
  });
}

export function useScanFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (folderId: string) => apiClient.scanFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watched-folders'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}

export function useScanAllFolders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.scanAllFolders(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watched-folders'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}

export function useFolderScanStatus(folderId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['folder-status', folderId],
    queryFn: () => apiClient.getFolderScanStatus(folderId),
    enabled: enabled && !!folderId,
    refetchInterval: (query) => {
      // Poll every 2 seconds while scanning
      return query.state.data?.status === 'scanning' ? 2000 : false;
    },
  });
}
