/**
 * useAuthCheck Hook
 * Checks authentication state
 */

import { useState, useEffect, useRef } from "react";
import { User } from "firebase/auth";
import { getCurrentUser } from "@/lib/firebase/auth";
import { StorageService } from "@/src/services/storageService";
import { STORAGE_KEYS } from "@/lib/constants";

export function useAuthCheck() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const currentUserRef = useRef<User | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== "undefined") {
        const storedUser = StorageService.loadUser();
        const currentUser = getCurrentUser();
        
        if (storedUser && currentUser && currentUser.uid === storedUser.uid) {
          setIsAuthenticated(true);
          setUser(currentUser);
          currentUserRef.current = currentUser;
        } else {
          setIsAuthenticated(false);
          setUser(null);
          currentUserRef.current = null;
        }
      }
    };

    checkAuth();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.USER) {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    const interval = setInterval(checkAuth, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return { isAuthenticated, user, currentUserRef };
}




