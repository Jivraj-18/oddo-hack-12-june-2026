import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { apiClient } from "./api-client";

export type Role = "admin" | "manager" | "employee";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  tourCompletedAt: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  markTourComplete: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_TOKEN_KEY = "ecosphere_access_token";
const REFRESH_TOKEN_KEY = "ecosphere_refresh_token";
const USER_KEY = "ecosphere_user";

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);

  function persist(data: { accessToken: string; refreshToken: string; user: AuthUser }) {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  }

  async function login(email: string, password: string) {
    const { data } = await apiClient.post("/auth/login", { email, password });
    persist(data);
  }

  async function register(name: string, email: string, password: string) {
    const { data } = await apiClient.post("/auth/register", { name, email, password });
    persist(data);
  }

  function logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  async function markTourComplete() {
    const { data } = await apiClient.patch<{ id: string; tourCompletedAt: string }>("/auth/me/tour-complete");
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, tourCompletedAt: data.tourCompletedAt };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  const value = useMemo(() => ({ user, login, register, logout, markTourComplete }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
