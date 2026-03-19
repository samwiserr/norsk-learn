/**
 * User Repository
 * Data access layer for user operations
 */

import { User } from "firebase/auth";
import { StorageService } from "@/src/services/storageService";

export class UserRepository {
  /**
   * Get current user from storage
   */
  static getCurrentUser(): User | null {
    return StorageService.loadUser();
  }

  /**
   * Save user to storage
   */
  static saveUser(user: User | null): void {
    StorageService.saveUser(user);
  }

  /**
   * Get user message count
   */
  static getUserMessageCount(): number {
    return StorageService.getUserMessageCount();
  }

  /**
   * Increment user message count
   */
  static incrementUserMessageCount(): number {
    return StorageService.incrementUserMessageCount();
  }

  /**
   * Reset user message count
   */
  static resetUserMessageCount(): void {
    StorageService.resetUserMessageCount();
  }
}

