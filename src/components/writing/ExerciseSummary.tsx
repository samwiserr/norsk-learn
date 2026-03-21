"use client";

import { getVocabStats } from "@/lib/vocabulary-tracker";
import "./exercise-picker.css";

interface ExerciseSummaryProps {
  score: number;
  turns: number;
  exerciseMode: string;
  onContinue: () => void;
  onNewExercise: () => void;
}

export default function ExerciseSummary({
  score,
  turns,
  exerciseMode,
  onContinue,
  onNewExercise,
}: ExerciseSummaryProps) {
  const vocabStats = getVocabStats();
  const accuracy = turns > 0 ? Math.round((score / turns) * 100) : 0;

  const MODE_LABELS: Record<string, string> = {
    free_conversation: "Free Conversation",
    translation: "Translation Practice",
    grammar_drill: "Grammar Drill",
    topic_practice: "Topic Practice",
  };

  return (
    <div className="exercise-summary">
      <div className="exercise-summary-header">
        <span className="exercise-summary-icon">
          {accuracy >= 80 ? "🌟" : accuracy >= 50 ? "💪" : "📚"}
        </span>
        <h3 className="exercise-summary-title">Session Progress</h3>
        <p className="exercise-summary-mode">{MODE_LABELS[exerciseMode] ?? exerciseMode}</p>
      </div>

      <div className="exercise-summary-stats">
        <div className="exercise-summary-stat">
          <span className="stat-value">{score}/{turns}</span>
          <span className="stat-label">Correct</span>
        </div>
        <div className="exercise-summary-stat">
          <span className="stat-value">{accuracy}%</span>
          <span className="stat-label">Accuracy</span>
        </div>
        <div className="exercise-summary-stat">
          <span className="stat-value">{vocabStats.totalWords}</span>
          <span className="stat-label">Words tracked</span>
        </div>
      </div>

      {accuracy >= 80 && (
        <p className="exercise-summary-praise">
          Excellent work! You&apos;re making great progress.
        </p>
      )}

      <div className="exercise-summary-actions">
        <button type="button" className="summary-btn summary-btn-primary" onClick={onContinue}>
          Keep Going
        </button>
        <button type="button" className="summary-btn summary-btn-secondary" onClick={onNewExercise}>
          Try a Different Exercise
        </button>
      </div>
    </div>
  );
}
