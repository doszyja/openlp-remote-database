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
    // Clear all auth-related queries
    queryClient.removeQueries({ queryKey: ['auth'] });
  };

  // Dev helper: expose login function to window for easy testing
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).__devLogin = async (token: string) => {
        await login(token);
        console.log('✅ Zalogowano jako dev user');
      };
      (window as any).__devLogout = () => {
        logout();
        console.log('✅ Wylogowano');
      };
      (window as any).__devSetAdmin = () => {
        // Create a mock admin user for dev testing
        const mockAdminUser: User = {
          id: 'dev-admin-id',
          discordId: 'dev-discord-id',
          username: 'Dev Admin',
          avatar: null,
          discordRoles: ['1161734352447746110'], // Admin role ID
        };
        // Set mock token and cache mock user in React Query
        const mockToken = 'dev-mock-token';
        localStorage.setItem(STORAGE_KEY, mockToken);
        setToken(mockToken);
        queryClient.setQueryData(['auth', 'me', mockToken], mockAdminUser);
        console.log('✅ Ustawiono jako dev admin (mock user)');
        console.log('Uwaga: To jest tylko mock - API calls mogą nie działać');
      };
      console.log('🔧 Dev helpers dostępne:');
      console.log('  - window.__devLogin(token) - zaloguj z tokenem');
      console.log('  - window.__devLogout() - wyloguj');
      console.log('  - window.__devSetAdmin() - ustaw jako admin (mock)');
    }
  }, [login, logout]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        token,
        isAuthenticated: !!user && !!token,
        hasEditPermission: user?.hasEditPermission ?? false,
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

