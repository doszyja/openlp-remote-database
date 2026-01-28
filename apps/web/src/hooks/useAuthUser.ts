import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  discordId: string;
  username: string;
  discriminator?: string | null;
  avatar?: string | null;
  discordRoles?: string[] | null;
  hasEditPermission?: boolean;
}

/**
 * Hook to fetch authenticated user with React Query caching
 * Caches user data for 10 minutes to avoid unnecessary requests
 */
export function useAuthUser(token: string | null) {
  // Always use relative paths - nginx handles proxying to the API
  // This avoids Mixed Content issues when frontend is served over HTTPS
  const apiUrl = '/api';

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
    // Return cached data immediately if available, but only if token exists
    placeholderData: previousData => {
      // If token is null, always return null (don't use cached data)
      if (!token) {
        return null;
      }
      return previousData;
    },
  });
}
