"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguageContext } from "@/src/context/LanguageContext";
import { FSRSCard, Rating, reviewCard, getDueCards, getCardStats } from "@/lib/srs/fsrs";
import { loadCards, updateCard } from "@/lib/srs/storage";

export default function ReviewPage() {
  const router = useRouter();
  useLanguageContext();

  const [allCards, setAllCards] = useState<FSRSCard[]>([]);
  const [dueCards, setDueCards] = useState<FSRSCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  useEffect(() => {
    const cards = loadCards();
    setAllCards(cards);
    setDueCards(getDueCards(cards));
  }, []);

  const currentCard = dueCards[currentIndex] ?? null;
  const stats = getCardStats(allCards);

  const handleRate = useCallback(
    (rating: Rating) => {
      if (!currentCard) return;
      const updated = reviewCard(currentCard, rating);
      updateCard(updated);
      setAllCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setReviewed((r) => r + 1);
      setShowAnswer(false);

      if (currentIndex + 1 >= dueCards.length) {
        setSessionDone(true);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [currentCard, currentIndex, dueCards.length]
  );

  if (dueCards.length === 0 && !sessionDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg-primary)]">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Review</h1>
          <p className="text-[var(--text-secondary)] mb-6">
            No cards due for review. Keep practicing conversations to build your review deck.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div>
              <div className="text-2xl font-bold text-[var(--primary)]">{stats.total}</div>
              <div className="text-xs text-[var(--text-secondary)]">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">{stats.mature}</div>
              <div className="text-xs text-[var(--text-secondary)]">Mature</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-500">{stats.learning}</div>
              <div className="text-xs text-[var(--text-secondary)]">Learning</div>
            </div>
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition"
          >
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  if (sessionDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg-primary)]">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Session Complete</h1>
          <p className="text-[var(--text-secondary)] mb-6">
            You reviewed {reviewed} card{reviewed !== 1 ? "s" : ""}.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition"
          >
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg-primary)]">
      <div className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            &larr; Back
          </button>
          <span className="text-sm text-[var(--text-secondary)]">
            {currentIndex + 1} / {dueCards.length}
          </span>
        </div>

        <div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 min-h-[280px] flex flex-col justify-center cursor-pointer"
          onClick={() => !showAnswer && setShowAnswer(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === " " && !showAnswer && setShowAnswer(true)}
        >
          <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)] mb-2">
            {currentCard?.category}
          </div>
          <div className="text-xl font-semibold mb-4">{currentCard?.front}</div>

          {showAnswer ? (
            <div className="border-t pt-4 mt-2">
              <div className="text-lg text-[var(--text-secondary)]">{currentCard?.back}</div>
            </div>
          ) : (
            <div className="text-sm text-[var(--text-secondary)] italic">Tap to reveal answer</div>
          )}
        </div>

        {showAnswer && (
          <div className="grid grid-cols-4 gap-3 mt-6">
            {[
              { rating: 1 as Rating, label: "Again", color: "bg-red-500" },
              { rating: 2 as Rating, label: "Hard", color: "bg-orange-500" },
              { rating: 3 as Rating, label: "Good", color: "bg-green-500" },
              { rating: 4 as Rating, label: "Easy", color: "bg-blue-500" },
            ].map(({ rating, label, color }) => (
              <button
                key={rating}
                onClick={() => handleRate(rating)}
                className={`${color} text-white py-3 rounded-xl font-medium hover:opacity-90 transition text-sm`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
