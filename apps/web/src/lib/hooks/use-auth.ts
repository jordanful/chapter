import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import { useRouter } from 'next/navigation';
import type { UserLogin, UserRegistration } from '@chapter/types';

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => apiClient.getCurrentUser(),
    retry: false,
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
