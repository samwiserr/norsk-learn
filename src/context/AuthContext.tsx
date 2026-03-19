"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { User } from "firebase/auth";
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  logout,
  resetPassword,
  onAuthStateChange,
  getCurrentUser,
  AuthError,
} from "@/lib/firebase/auth";
import {
  loadFromLocalStorage,
  saveToLocalStorage,
} from "@/lib/storage";
import { Session } from "@/lib/sessions";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPasswordEmail: (email: string) => Promise<void>;
  associateSessionsWithUser: () => void;
}

export const AuthContext = createContext<AuthContextValue>(
  {} as AuthContextValue
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // Load user from localStorage on mount (for persistence)
  useEffect(() => {
    const storedUser = loadFromLocalStorage<User>("norsk_user");
    if (storedUser) {
      // Verify user is still authenticated
      const currentUser = getCurrentUser();
      if (currentUser && currentUser.uid === storedUser.uid) {
        setUser(currentUser);
      }
    }
    setLoading(false);
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Save user to localStorage for persistence
      if (currentUser) {
        saveToLocalStorage("norsk_user", {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        });
      } else {
        if (typeof window !== "undefined") {
          localStorage.removeItem("norsk_user");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      await signUpWithEmail(email, password);
      // User state will be updated via onAuthStateChange
    } catch (err) {
      setError(err as AuthError);
      throw err;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmail(email, password);
      // User state will be updated via onAuthStateChange
    } catch (err) {
      setError(err as AuthError);
      throw err;
    }
  }, []);

  const signInGoogle = useCallback(async () => {
    try {
      setError(null);
      await signInWithGoogle();
      // User state will be updated via onAuthStateChange
    } catch (err) {
      setError(err as AuthError);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setError(null);
      await logout();
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("norsk_user");
      }
    } catch (err) {
      setError(err as AuthError);
      throw err;
    }
  }, []);

  const resetPasswordEmail = useCallback(async (email: string) => {
    try {
      setError(null);
      await resetPassword(email);
    } catch (err) {
      setError(err as AuthError);
      throw err;
    }
  }, []);

  // Associate existing sessions with user ID after authentication
  const associateSessionsWithUser = useCallback(() => {
    if (!user) return;

    const sessions = loadFromLocalStorage<Session[]>("norsk_sessions") || [];
    const updatedSessions = sessions.map((session) => ({
      ...session,
      userId: session.userId || user.uid,
    }));

    saveToLocalStorage("norsk_sessions", updatedSessions);
  }, [user]);

  // Automatically associate sessions when user logs in
  useEffect(() => {
    if (user) {
      associateSessionsWithUser();
    }
  }, [user, associateSessionsWithUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signUp,
        signIn,
        signInGoogle,
        signOut,
        resetPasswordEmail,
        associateSessionsWithUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

