import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthUser } from '../hooks/useAuthUser';
import { useQueryClient } from '@tanstack/react-query';

interface User {
  id: string;
  discordId: string;
  username: string;
  discriminator?: string | null;
  avatar?: string | null;
  discordRoles?: string[] | null;
  hasEditPermission?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hasEditPermission: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEY);
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  // Refetch user data when token changes
  useEffect(() => {
    if (token) {
      queryClient.refetchQueries({ queryKey: ['auth', 'me', token] });
    }
  }, [token, queryClient]);

  // Use React Query to fetch and cache user data
  const { data: user, isLoading, isError } = useAuthUser(token);

  // Update user state when query data changes
  useEffect(() => {
    // Only clear token if there's an error or if query completed and user is null
    if (isError) {
      // User fetch failed, clear token
      localStorage.removeItem(STORAGE_KEY);
      setToken(null);
      queryClient.removeQueries({ queryKey: ['auth', 'me'] });
    } else if (!isLoading && !user && token) {
      // Query completed but no user data - token might be invalid
      // But wait a bit to avoid race conditions
      const timeout = setTimeout(() => {
        if (!user && token) {
          localStorage.removeItem(STORAGE_KEY);
          setToken(null);
          queryClient.removeQueries({ queryKey: ['auth', 'me'] });
        }
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [user, token, isError, isLoading, queryClient]);

  const login = async (authToken: string) => {
    localStorage.setItem(STORAGE_KEY, authToken);
    setToken(authToken);
    // Invalidate and refetch user data
    await queryClient.invalidateQueries({ queryKey: ['auth', 'me', authToken] });
    // Also refetch to ensure data is loaded
    await queryClient.refetchQueries({ queryKey: ['auth', 'me', authToken] });
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    // Clear all auth-related queries and set user data to null
    queryClient.removeQueries({ queryKey: ['auth'] });
    // Also explicitly set user data to null to prevent stale data
    queryClient.setQueryData(['auth', 'me', null], null);
    queryClient.setQueryData(['auth', 'me'], null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        token,
        isAuthenticated: !!user && !!token,
        hasEditPermission: user?.hasEditPermission ?? false, // Use hasEditPermission from user data
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

