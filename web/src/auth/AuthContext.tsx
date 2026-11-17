import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  get,
  post,
  refreshTokens,
  setSignedOutHandler,
  storedRefreshToken,
  storeTokens,
} from '../api/client';
import type { Tokens, User } from '../api/types';

interface AuthState {
  user: User | null;
  /** True until we know whether a saved session is still valid. */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signedOut = useCallback(() => {
    storeTokens(null);
    setUser(null);
    qc.removeQueries({ queryKey: ['cart'] });
    qc.removeQueries({ queryKey: ['orders'] });
    qc.removeQueries({ queryKey: ['admin'] });
  }, [qc]);

  // On load, turn a saved refresh token back into a signed-in user.
  useEffect(() => {
    setSignedOutHandler(signedOut);
    let cancelled = false;

    (async () => {
      if (storedRefreshToken() && (await refreshTokens())) {
        try {
          const me = await get<User>('/auth/me');
          if (!cancelled) setUser(me);
        } catch {
          if (!cancelled) signedOut();
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [signedOut]);

  const value = useMemo<AuthState>(() => {
    const start = (result: { user: User } & Tokens) => {
      storeTokens(result);
      setUser(result.user);
      qc.removeQueries({ queryKey: ['cart'] });
      return result.user;
    };

    return {
      user,
      loading,
      login: async (email, password) =>
        start(
          await post<{ user: User } & Tokens>('/auth/login', {
            email,
            password,
          }),
        ),
      register: async (name, email, password) =>
        start(
          await post<{ user: User } & Tokens>('/auth/register', {
            name,
            email,
            password,
          }),
        ),
      logout: async () => {
        const refreshToken = storedRefreshToken();
        if (refreshToken) {
          await post('/auth/logout', { refreshToken }).catch(() => undefined);
        }
        signedOut();
      },
    };
  }, [user, loading, qc, signedOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
