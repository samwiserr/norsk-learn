import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/storage";

const STORAGE_KEY = "norsk_vocabulary";

export interface VocabEntry {
  word: string;
  translations: string[];
  correctCount: number;
  incorrectCount: number;
  lastSeen: number;
  category?: string;
}

export interface VocabStore {
  entries: Record<string, VocabEntry>;
  updatedAt: number;
}

function load(): VocabStore {
  return loadFromLocalStorage<VocabStore>(STORAGE_KEY) ?? { entries: {}, updatedAt: Date.now() };
}

function save(store: VocabStore) {
  store.updatedAt = Date.now();
  saveToLocalStorage(STORAGE_KEY, store);
}

export function recordCorrectWord(word: string, translation?: string) {
  const store = load();
  const key = word.toLowerCase().trim();
  if (!key) return;
  const existing = store.entries[key];
  store.entries[key] = {
    word: key,
    translations: existing?.translations ?? (translation ? [translation] : []),
    correctCount: (existing?.correctCount ?? 0) + 1,
    incorrectCount: existing?.incorrectCount ?? 0,
    lastSeen: Date.now(),
    category: existing?.category,
  };
  if (translation && !store.entries[key].translations.includes(translation)) {
    store.entries[key].translations.push(translation);
  }
  save(store);
}

export function recordIncorrectWord(word: string, correction?: string) {
  const store = load();
  const key = word.toLowerCase().trim();
  if (!key) return;
  const existing = store.entries[key];
  store.entries[key] = {
    word: key,
    translations: existing?.translations ?? [],
    correctCount: existing?.correctCount ?? 0,
    incorrectCount: (existing?.incorrectCount ?? 0) + 1,
    lastSeen: Date.now(),
    category: existing?.category,
  };
  if (correction) {
    const corrKey = correction.toLowerCase().trim();
    if (corrKey && corrKey !== key) {
      store.entries[corrKey] = {
        word: corrKey,
        translations: store.entries[corrKey]?.translations ?? [],
        correctCount: store.entries[corrKey]?.correctCount ?? 0,
        incorrectCount: store.entries[corrKey]?.incorrectCount ?? 0,
        lastSeen: Date.now(),
      };
    }
  }
  save(store);
}

export function getStrugglingWords(limit = 10): VocabEntry[] {
  const store = load();
  return Object.values(store.entries)
    .filter((e) => e.incorrectCount > 0)
    .sort((a, b) => {
      const ratioA = a.incorrectCount / Math.max(a.correctCount + a.incorrectCount, 1);
      const ratioB = b.incorrectCount / Math.max(b.correctCount + b.incorrectCount, 1);
      return ratioB - ratioA;
    })
    .slice(0, limit);
}

export function getMasteredWords(limit = 20): VocabEntry[] {
  const store = load();
  return Object.values(store.entries)
    .filter((e) => e.correctCount >= 3 && e.incorrectCount === 0)
    .sort((a, b) => b.correctCount - a.correctCount)
    .slice(0, limit);
}

export function getVocabStats() {
  const store = load();
  const entries = Object.values(store.entries);
  return {
    totalWords: entries.length,
    mastered: entries.filter((e) => e.correctCount >= 3 && e.incorrectCount === 0).length,
    struggling: entries.filter((e) => e.incorrectCount > e.correctCount).length,
    learning: entries.filter((e) => e.correctCount > 0 && e.correctCount < 3).length,
  };
}
