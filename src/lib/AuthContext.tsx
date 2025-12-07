"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type UserType = "parent" | "kid" | null;

interface ParentUser {
  name: string;
  email: string;
  settings: {
    language: string;
    theme: string;
    notifications: boolean;
  };
}

interface KidUser {
  name: string;
  level: number;
  xp: number;
  streak: number;
  coins: number;
  settings: {
    language: string;
    theme: string;
  };
}

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  userType: UserType;
  userId: Id<"users"> | null;
  kidId: Id<"kids"> | null;
  user: ParentUser | null;
  kid: KidUser | null;
  token: string | null;
  loginParent: (email: string, password: string) => Promise<void>;
  registerParent: (email: string, password: string, name: string) => Promise<void>;
  loginKid: (parentEmail: string, kidName: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

const TOKEN_KEY = "moneynplay_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Convex mutations
  const loginParentMutation = useMutation(api.auth.loginParent);
  const registerParentMutation = useMutation(api.auth.registerParent);
  const loginKidMutation = useMutation(api.auth.loginKid);
  const logoutMutation = useMutation(api.auth.logout);

  // Validate session query
  const sessionData = useQuery(
    api.auth.validateSession,
    token ? { token } : "skip"
  );

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      setToken(savedToken);
    }
    setIsLoading(false);
  }, []);

  // Update loading state based on session validation
  useEffect(() => {
    if (token && sessionData === undefined) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [token, sessionData]);

  const loginParent = useCallback(
    async (email: string, password: string) => {
      const result = await loginParentMutation({ email, password });
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
    },
    [loginParentMutation]
  );

  const registerParent = useCallback(
    async (email: string, password: string, name: string) => {
      const result = await registerParentMutation({ email, password, name });
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
    },
    [registerParentMutation]
  );

  const loginKid = useCallback(
    async (parentEmail: string, kidName: string, pin: string) => {
      const result = await loginKidMutation({ parentEmail, kidName, pin });
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
    },
    [loginKidMutation]
  );

  const logout = useCallback(async () => {
    if (token) {
      try {
        await logoutMutation({ token });
      } catch (e) {
        // Ignore errors during logout
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, [token, logoutMutation]);

  // Derive auth state from session data
  const isAuthenticated = !!sessionData;
  const userType: UserType = sessionData?.type || null;
  const userId = sessionData?.type === "parent" ? sessionData.userId : null;
  const kidId = sessionData?.type === "kid" ? sessionData.kidId : null;
  const user = sessionData?.type === "parent" ? sessionData.user : null;
  const kid = sessionData?.type === "kid" ? sessionData.kid : null;

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated,
        userType,
        userId,
        kidId,
        user,
        kid,
        token,
        loginParent,
        registerParent,
        loginKid,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
