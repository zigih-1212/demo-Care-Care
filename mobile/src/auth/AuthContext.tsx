/**
 * Authentication context.
 *
 * Owns the single source of truth for "who is signed in" and exposes
 * login/register/logout. It bootstraps by reading tokens from secure storage
 * and validating them against /me, so a reopened app restores the session.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authApi } from '@/api/endpoints';
import { setUnauthorizedHandler } from '@/api/client';
import { tokenStorage } from '@/auth/tokenStorage';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; full_name: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('loading');

  const logout = useCallback(async () => {
    const tokens = await tokenStorage.load();
    if (tokens?.refresh) {
      // Best-effort server-side blacklist; local clear happens regardless.
      try {
        await authApi.logout(tokens.refresh);
      } catch {
        /* offline logout must still succeed locally */
      }
    }
    await tokenStorage.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  // When a refresh finally fails deep in the client, drop to anonymous.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('anonymous');
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tokens = await tokenStorage.load();
      if (!tokens) {
        if (!cancelled) setStatus('anonymous');
        return;
      }
      try {
        const me = await authApi.me();
        if (!cancelled) {
          setUser(me);
          setStatus('authenticated');
        }
      } catch {
        if (!cancelled) {
          await tokenStorage.clear();
          setStatus('anonymous');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login(email, password);
    await tokenStorage.save(tokens);
    const me = await authApi.me();
    setUser(me);
    setStatus('authenticated');
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; full_name: string }) => {
      await authApi.register(input);
      await login(input.email, input.password);
    },
    [login],
  );

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, status, login, register, logout, refreshUser }),
    [user, status, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
