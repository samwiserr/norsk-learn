// Firebase Authentication wrapper functions
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "./config";

export interface AuthError {
  code: string;
  message: string;
}

// Google OAuth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Sign up with email and password
export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  } catch (error: any) {
    throw {
      code: error.code || "auth/unknown-error",
      message: error.message || "An unknown error occurred",
    } as AuthError;
  }
};

// Sign in with email and password
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  } catch (error: any) {
    throw {
      code: error.code || "auth/unknown-error",
      message: error.message || "An unknown error occurred",
    } as AuthError;
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    throw {
      code: error.code || "auth/unknown-error",
      message: error.message || "An unknown error occurred",
    } as AuthError;
  }
};

// Sign out
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw {
      code: error.code || "auth/unknown-error",
      message: error.message || "An unknown error occurred",
    } as AuthError;
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw {
      code: error.code || "auth/unknown-error",
      message: error.message || "An unknown error occurred",
    } as AuthError;
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Auth state observer
export const onAuthStateChange = (
  callback: (user: User | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

