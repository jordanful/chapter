import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import { useRouter } from 'next/navigation';
import type { UserLogin, UserRegistration, UserProfile } from '@chapter/types';

const USER_CACHE_KEY = 'chapter_user_cache';

function getCachedUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function setCachedUser(user: UserProfile | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const user = await apiClient.getCurrentUser();
        // Cache user for offline access
        setCachedUser(user);
        return user;
      } catch (error) {
        // If offline and we have a cached user, use that
        if (!navigator.onLine) {
          const cachedUser = getCachedUser();
          if (cachedUser) {
            return cachedUser;
          }
        }
        // Clear cache on auth failure when online
        setCachedUser(null);
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!navigator.onLine) return false;
      return false; // Keep original behavior of no retries
    },
  });

  const loginMutation = useMutation({
    mutationFn: (data: UserLogin) => apiClient.login(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      router.push('/library');
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: UserRegistration) => apiClient.register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      router.push('/library');
    },
  });

  const logout = () => {
    apiClient.logout();
    setCachedUser(null);
    queryClient.clear();
    router.push('/login');
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}
