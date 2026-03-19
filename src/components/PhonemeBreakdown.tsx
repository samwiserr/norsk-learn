"use client";

export interface PhonemeScore {
  phoneme: string;
  accuracyScore: number;
}

export interface WordScore {
  word: string;
  accuracyScore: number;
  phonemes: PhonemeScore[];
}

interface PhonemeBreakdownProps {
  words: WordScore[];
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-green-50 dark:bg-green-900/20";
  if (score >= 50) return "bg-amber-50 dark:bg-amber-900/20";
  return "bg-red-50 dark:bg-red-900/20";
}

export default function PhonemeBreakdown({ words }: PhonemeBreakdownProps) {
  if (!words || words.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
        Pronunciation Detail
      </h3>
      <div className="flex flex-wrap gap-2">
        {words.map((w, wi) => (
          <div
            key={`${w.word}-${wi}`}
            className={`rounded-lg p-2 ${scoreBg(w.accuracyScore)} border border-black/5`}
          >
            <div className={`text-sm font-medium ${scoreColor(w.accuracyScore)}`}>
              {w.word}
              <span className="ml-1 text-xs opacity-70">{Math.round(w.accuracyScore)}%</span>
            </div>
            {w.phonemes.length > 0 && (
              <div className="flex gap-1 mt-1">
                {w.phonemes.map((p, pi) => (
                  <span
                    key={`${p.phoneme}-${pi}`}
                    className={`text-xs px-1.5 py-0.5 rounded ${scoreColor(p.accuracyScore)} ${scoreBg(p.accuracyScore)}`}
                    title={`${p.phoneme}: ${Math.round(p.accuracyScore)}%`}
                  >
                    {p.phoneme}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="text-xs text-[var(--text-secondary)] flex gap-4 mt-2">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Good (80%+)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Fair (50-79%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Needs work (&lt;50%)
        </span>
      </div>
    </div>
  );
}
