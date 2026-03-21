"use client";

interface MainExerciseBarProps {
  label: string;
  exerciseScore: number;
  exerciseTurns: number;
  scoreBadgeSuffix: string;
  newExerciseLabel: string;
  onNewExercise: () => void;
}

export function MainExerciseBar({
  label,
  exerciseScore,
  exerciseTurns,
  scoreBadgeSuffix,
  newExerciseLabel,
  onNewExercise,
}: MainExerciseBarProps) {
  return (
    <div className="exercise-mode-bar">
      <span className="exercise-mode-label">{label}</span>
      {exerciseTurns > 0 && (
        <span className="exercise-score-badge">
          {exerciseScore}/{exerciseTurns} {scoreBadgeSuffix}
        </span>
      )}
      <button type="button" className="exercise-mode-change" onClick={onNewExercise}>
        {newExerciseLabel}
      </button>
    </div>
  );
}
