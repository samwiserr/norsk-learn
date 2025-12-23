"use client";

export const saveToLocalStorage = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
};

export const loadFromLocalStorage = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const deleteFromLocalStorage = (key: string) => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
};

// User message counter helpers
const MESSAGE_COUNTER_KEY = "norsk_user_message_count";

export const getUserMessageCount = (): number => {
  const count = loadFromLocalStorage<number>(MESSAGE_COUNTER_KEY);
  return count ?? 0;
};

export const incrementUserMessageCount = (): number => {
  const current = getUserMessageCount();
  const newCount = current + 1;
  saveToLocalStorage(MESSAGE_COUNTER_KEY, newCount);
  return newCount;
};

export const resetUserMessageCount = (): void => {
  deleteFromLocalStorage(MESSAGE_COUNTER_KEY);
};

