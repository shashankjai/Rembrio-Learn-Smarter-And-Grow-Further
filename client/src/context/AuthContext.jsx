import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, onUnauthorized, tokenStore } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // Restore the session on first load.
  useEffect(() => {
    if (!tokenStore.get()) return;
    let active = true;
    api.auth
      .me()
      .then((data) => active && setUser(data.user))
      .catch(() => active && clearSession())
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [clearSession]);

  // Any 401 from the API (expired / revoked token) signs the user out locally.
  useEffect(() => {
    onUnauthorized(clearSession);
    return () => onUnauthorized(null);
  }, [clearSession]);

  const startSession = useCallback((data) => {
    tokenStore.set(data.token);
    setUser(data.user);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(credentials) {
        startSession(await api.auth.login(credentials));
      },
      async register(details) {
        startSession(await api.auth.register(details));
      },
      async logout() {
        try {
          await api.auth.logout(); // revokes the token server-side
        } catch {
          /* still sign out locally */
        }
        clearSession();
      },
      /** Apply an updated profile response (may include a rotated token after a password change). */
      applyProfile(data) {
        if (data.token) tokenStore.set(data.token);
        setUser(data.user);
      },
    }),
    [user, loading, startSession, clearSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
