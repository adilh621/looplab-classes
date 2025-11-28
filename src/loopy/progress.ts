export type Progress = {
  unlockedLevels: number[];
  bestStars: Record<number, number>; // stars 1–3
  currentLevel?: number; // current level the user is on
};

const STORAGE_KEY = "loopy_progress_v1";

export function loadProgress(): Progress {
  if (typeof window === "undefined") {
    return { unlockedLevels: [1], bestStars: {} };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Progress;
      // Ensure level 1 is always unlocked
      if (!parsed.unlockedLevels.includes(1)) {
        parsed.unlockedLevels.push(1);
      }
      return parsed;
    }
  } catch (e) {
    // Silently fail and return default progress
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to load progress:", e);
    }
  }
  
  return { unlockedLevels: [1], bestStars: {} };
}

export function saveProgress(progress: Progress): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    // Silently fail - progress saving is not critical
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to save progress:", e);
    }
  }
}

export function clearProgress(): void {
  if (typeof window === "undefined") return;
  
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

