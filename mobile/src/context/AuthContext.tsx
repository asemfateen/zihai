import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken } from '../utils/api';

interface User {
  id: number;
  email: string;
  display_name: string | null;
  is_admin: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await getAuthToken();
        if (storedToken) {
          setToken(storedToken);
          // Fetch current user details from /me endpoint
          const userData = await api.get<User>('/me');
          setUser(userData);
        }
      } catch (err) {
        console.log('[AuthContext] Session restore failed:', err);
        await setAuthToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ token: string; id: number; email: string; display_name: string | null; is_admin: number }>('/login', { email, password });
      await setAuthToken(res.token);
      setToken(res.token);
      setUser({
        id: res.id,
        email: res.email,
        display_name: res.display_name,
        is_admin: res.is_admin,
      });
    } catch (err) {
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ token: string; id: number; email: string; display_name: string | null; is_admin: number }>('/register', { email, password });
      await setAuthToken(res.token);
      setToken(res.token);
      setUser({
        id: res.id,
        email: res.email,
        display_name: res.display_name,
        is_admin: res.is_admin,
      });
    } catch (err) {
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await setAuthToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (displayName: string) => {
    const updated = await api.patch<{ email: string; display_name: string | null }>('/profile', { display_name: displayName });
    if (user) {
      setUser({
        ...user,
        display_name: updated.display_name,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
