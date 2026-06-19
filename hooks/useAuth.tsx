"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { me, type UserOut } from "@/lib/api/auth";

interface AuthContextValue {
  user: UserOut | null;
  loading: boolean;
  hasRole: (role: string) => boolean;
  refreshUser: () => Promise<UserOut | null>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  hasRole: () => false,
  refreshUser: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const hasRole = useCallback(
    (role: string) => user?.roles?.includes(role) ?? false,
    [user]
  );

  const refreshUser = useCallback(async () => {
    if (loading) return null;
    setLoading(true);
    try {
      const currentUser = await me();
      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return (
    <AuthContext.Provider value={{ user, loading, hasRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
