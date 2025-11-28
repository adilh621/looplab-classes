export type Progress = {
  unlockedLevels: number[];
  bestStars: Record<number, number>; // stars 1–3
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
    console.error("Failed to load progress:", e);
  }
  
  return { unlockedLevels: [1], bestStars: {} };
}

export function saveProgress(progress: Progress): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error("Failed to save progress:", e);
  }
}

