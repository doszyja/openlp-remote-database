import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  discordId: string;
  username: string;
  discriminator?: string | null;
  avatar?: string | null;
  discordRoles?: string[] | null;
}

/**
 * Hook to fetch authenticated user with React Query caching
 * Caches user data for 10 minutes to avoid unnecessary requests
 */
export function useAuthUser(token: string | null) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  return useQuery<User | null>({
    queryKey: ['auth', 'me', token],
    queryFn: async () => {
      if (!token) {
        return null;
      }

      const response = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Token is invalid
        localStorage.removeItem('auth_token');
        throw new Error('Invalid token');
      }

      const userData = await response.json();
      return userData;
    },
    enabled: !!token,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: false, // Don't retry on auth errors
    // Return cached data immediately if available
    placeholderData: (previousData) => previousData,
  });
}

