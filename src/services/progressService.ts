/**
 * Progress Service
 * Business logic for progress calculations
 */

import { getCurrentCEFRLevel } from "@/lib/cefr-progress";
import { CEFRLevel } from "@/lib/cefr";

export class ProgressService {
  /**
   * Get current CEFR level from progress value
   */
  static getCurrentLevel(progress: number): CEFRLevel {
    return getCurrentCEFRLevel(progress);
  }

  /**
   * Calculate progress percentage
   */
  static getPercentage(progress: number): number {
    return Math.round(progress);
  }
}




