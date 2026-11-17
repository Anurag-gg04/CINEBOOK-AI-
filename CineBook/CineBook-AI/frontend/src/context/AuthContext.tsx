import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, readSession, restoreSession, saveSession, type Session, type User } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<string>;
  acceptSession: (session: Session) => void;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    restoreSession().then(restored => {
      if (!active) return;
      saveSession(restored);
      setSession(restored);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const acceptSession = useCallback((next: Session) => {
    saveSession(next);
    setSession(next);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await api<Session>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password })
    }, false);
    acceptSession(next);
  }, [acceptSession]);

  const register = useCallback(async (displayName: string, email: string, password: string) => {
    const response = await api<{ tokens: Session | null; message: string }>('/auth/register', {
      method: 'POST', body: JSON.stringify({ displayName, email, password })
    }, false);
    if (response.tokens) acceptSession(response.tokens);
    return response.message;
  }, [acceptSession]);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' }, false);
    } finally {
      saveSession(null);
      setSession(null);
    }
  }, []);


  const value = useMemo(() => ({
    user: session?.user || null, loading, login, register, acceptSession, logout, setLoading
  }), [session, loading, login, register, acceptSession, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
