import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api-client';
import { clearSupabaseSession, loadSupabaseSession, registerAuthWorker, storeSupabaseSession } from '../lib/auth-service-worker';
import type { User } from '../types';

const EMAIL_KEY = 'ecommerce:last-email';

export type AuthStatus = 'idle' | 'checking' | 'authenticated' | 'error';

type AuthContextValue = {
  token: string | null;
  user: User | null;
  status: AuthStatus;
  lastEmail: string;
  sendMagicLink: (email: string) => Promise<{ expiresAt: string | null }>;
  logout: () => Promise<void>;
  refreshProfile: (tokenOverride?: string) => Promise<User | null>;
  applyUser: (next: User) => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sessionRef = useRef<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [lastEmail, setLastEmail] = useState(() => {
    return typeof window !== 'undefined' ? window.localStorage.getItem(EMAIL_KEY) ?? '' : '';
  });

  const persistEmail = useCallback((email: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(EMAIL_KEY, email);
    setLastEmail(email);
  }, []);

  const applySession = useCallback(async (nextSession: Session | null) => {
    sessionRef.current = nextSession;
    const accessToken = nextSession?.access_token ?? null;
    setToken(accessToken);
    if (nextSession) {
      await storeSupabaseSession(nextSession);
    } else {
      await clearSupabaseSession();
    }
  }, []);

  const refreshProfile = useCallback(
    async (tokenOverride?: string) => {
      const activeToken = tokenOverride ?? sessionRef.current?.access_token ?? null;
      if (!activeToken) {
        setUser(null);
        return null;
      }
      try {
        const response = await api.getProfile(activeToken);
        setUser(response.user);
        return response.user;
      } catch (error) {
        await applySession(null);
        throw error;
      }
    },
    [applySession]
  );

  const sendMagicLink = useCallback(
    async (email: string) => {
      await registerAuthWorker();
      const normalizedEmail = email.trim().toLowerCase();
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : null;
      const options: { shouldCreateUser: boolean; emailRedirectTo?: string } = {
        shouldCreateUser: true
      };
      if (redirectTo) {
        options.emailRedirectTo = redirectTo;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options
      });
      if (error) {
        throw error;
      }
      persistEmail(normalizedEmail);
      setStatus('checking');
      return { expiresAt: null };
    },
    [persistEmail]
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    await applySession(null);
    setUser(null);
    setStatus('idle');
  }, [applySession]);

  const applyUser = useCallback((next: User) => {
    setUser(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setStatus('checking');
      try {
        await registerAuthWorker();
        const stored = await loadSupabaseSession<Session>();
        let activeSession = stored ?? null;

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }

        if (data.session) {
          activeSession = data.session;
        } else if (stored?.access_token && stored?.refresh_token) {
          const { data: rehydrated, error: rehydrateError } = await supabase.auth.setSession({
            access_token: stored.access_token,
            refresh_token: stored.refresh_token
          });
          if (!rehydrateError && rehydrated.session) {
            activeSession = rehydrated.session;
          } else if (rehydrateError) {
            console.warn('No pudimos rehidratar la sesión en Supabase', rehydrateError);
          }
        }

        if (activeSession) {
          await applySession(activeSession);
          await refreshProfile(activeSession.access_token);
          if (!cancelled) {
            setStatus('authenticated');
          }
        } else if (!cancelled) {
          setStatus('idle');
        }
      } catch (error) {
        console.error('Auth bootstrap failed', error);
        if (!cancelled) {
          setStatus('error');
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [applySession, refreshProfile]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await applySession(session);
      if (session?.access_token) {
        try {
          await refreshProfile(session.access_token);
          setStatus('authenticated');
        } catch (error) {
          console.error('No pudimos actualizar el perfil después de un cambio de sesión', error);
          setStatus('error');
        }
      } else {
        setUser(null);
        setStatus('idle');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [applySession, refreshProfile]);

  const isAuthenticated = Boolean(token);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      status,
      lastEmail,
      sendMagicLink,
      logout,
      refreshProfile,
      applyUser,
      isAuthenticated
    }),
    [token, user, status, lastEmail, sendMagicLink, logout, refreshProfile, applyUser, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
