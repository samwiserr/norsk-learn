import { FSRSCard } from "./fsrs";
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/storage";

const STORAGE_KEY = "norsk_srs_cards";

export function loadCards(): FSRSCard[] {
  return loadFromLocalStorage<FSRSCard[]>(STORAGE_KEY) ?? [];
}

export function saveCards(cards: FSRSCard[]): void {
  saveToLocalStorage(STORAGE_KEY, cards);
}

export function addCard(card: FSRSCard): void {
  const cards = loadCards();
  const exists = cards.some(
    (c) => c.front === card.front && c.language === card.language
  );
  if (!exists) {
    cards.push(card);
    saveCards(cards);
  }
}

export function updateCard(updated: FSRSCard): void {
  const cards = loadCards();
  const idx = cards.findIndex((c) => c.id === updated.id);
  if (idx >= 0) {
    cards[idx] = updated;
    saveCards(cards);
  }
}

export function deleteCard(id: string): void {
  const cards = loadCards().filter((c) => c.id !== id);
  saveCards(cards);
}
