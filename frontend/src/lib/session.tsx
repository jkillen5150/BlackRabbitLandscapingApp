import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, User } from '@/lib/api';

const STORAGE_KEY = 'blackrabbit_session';

interface Session {
  userId: number;
  phone: string;
  name: string;
  isProvider: boolean;
}

interface SessionContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  setSession: (s: Session | null) => void;
  refreshUser: () => Promise<void>;
  signInWithPhone: (phone: string, name: string, asProvider?: boolean) => Promise<User>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function loadSession(): Session | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    }
  } catch {}
  return null;
}

function saveSession(session: Session | null) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setSession = useCallback((s: Session | null) => {
    setSessionState(s);
    saveSession(s);
    if (!s) setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!session) return;
    try {
      const u = await api.getUser(session.userId);
      setUser(u);
      setSessionState((prev) =>
        prev
          ? { ...prev, name: u.name, isProvider: u.is_provider }
          : prev
      );
    } catch {
      setSession(null);
    }
  }, [session, setSession]);

  useEffect(() => {
    const stored = loadSession();
    if (stored) setSessionState(stored);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session?.userId) {
      api.getUser(session.userId).then(setUser).catch(() => setSession(null));
    }
  }, [session?.userId, setSession]);

  const signInWithPhone = useCallback(
    async (phone: string, name: string, asProvider = false): Promise<User> => {
      let u: User;
      try {
        u = await api.getUserByPhone(phone);
        if (asProvider && !u.is_provider) {
          u = await api.updateUser(u.id, { is_provider: true });
        }
      } catch {
        u = await api.createUser({ name, phone, is_provider: asProvider });
      }
      const s: Session = {
        userId: u.id,
        phone: u.phone,
        name: u.name,
        isProvider: u.is_provider,
      };
      setSession(s);
      setUser(u);
      return u;
    },
    [setSession]
  );

  return (
    <SessionContext.Provider
      value={{ session, user, loading, setSession, refreshUser, signInWithPhone }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}