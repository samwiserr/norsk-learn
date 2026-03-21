"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguageContext } from "@/src/context/LanguageContext";
import { FSRSCard, Rating, reviewCard, getDueCards, getCardStats } from "@/lib/srs/fsrs";
import { loadCards, updateCard } from "@/lib/srs/storage";
import { Button } from "@/src/components/ui";

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-foreground">Review</h1>
          <p className="mb-6 text-muted-foreground">
            No cards due for review. Keep practicing conversations to build your review deck.
          </p>
          <div className="mb-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">{stats.mature}</div>
              <div className="text-xs text-muted-foreground">Mature</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-500">{stats.learning}</div>
              <div className="text-xs text-muted-foreground">Learning</div>
            </div>
          </div>
          <Button size="lg" className="rounded-xl" onClick={() => router.push("/")}>
            Back to Chat
          </Button>
        </div>
      </div>
    );
  }

  if (sessionDone) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold text-foreground">Session Complete</h1>
          <p className="mb-6 text-muted-foreground">
            You reviewed {reviewed} card{reviewed !== 1 ? "s" : ""}.
          </p>
          <Button size="lg" className="rounded-xl" onClick={() => router.push("/")}>
            Back to Chat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            &larr; Back
          </button>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {dueCards.length}
          </span>
        </div>

        <div
          className="flex min-h-[280px] cursor-pointer flex-col justify-center rounded-3xl border border-border/80 bg-card/95 p-8 shadow-[0_16px_30px_hsl(224_30%_30%_/_0.1)]"
          onClick={() => !showAnswer && setShowAnswer(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              if (!showAnswer) setShowAnswer(true);
            }
          }}
        >
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {currentCard?.category}
          </div>
          <div className="mb-4 text-xl font-semibold text-card-foreground">{currentCard?.front}</div>

          {showAnswer ? (
            <div className="mt-2 border-t border-border pt-4">
              <div className="text-lg text-muted-foreground">{currentCard?.back}</div>
            </div>
          ) : (
            <div className="text-sm italic text-muted-foreground">Tap to reveal answer</div>
          )}
        </div>

        {showAnswer && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { rating: 1 as Rating, label: "Again", color: "bg-red-500" },
              { rating: 2 as Rating, label: "Hard", color: "bg-orange-500" },
              { rating: 3 as Rating, label: "Good", color: "bg-green-500" },
              { rating: 4 as Rating, label: "Easy", color: "bg-blue-500" },
            ].map(({ rating, label, color }) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleRate(rating)}
                className={`${color} rounded-2xl py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:opacity-95`}
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
