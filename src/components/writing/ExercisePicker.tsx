"use client";

import { useState } from "react";
import {
  EXERCISE_MODES,
  getTopicsForLevel,
  getGrammarTopicsForLevel,
  type ExerciseMode,
} from "@/lib/exercise-modes";
import "./exercise-picker.css";

interface ExercisePickerProps {
  cefrLevel: string;
  onSelect: (mode: ExerciseMode, topicId?: string) => void;
}

type Step = "mode" | "topic" | "grammar";

const EXERCISE_LABELS: Record<string, Record<string, string>> = {
  exerciseFreeConversation: { en: "Free Conversation", no: "Fri samtale" },
  exerciseFreeConversationDesc: { en: "Chat freely with the tutor about anything", no: "Snakk fritt med veilederen om hva som helst" },
  exerciseTranslation: { en: "Translation Practice", no: "Oversettelsesøvelse" },
  exerciseTranslationDesc: { en: "Translate sentences between your language and Norwegian", no: "Oversett setninger mellom språket ditt og norsk" },
  exerciseGrammarDrill: { en: "Grammar Drill", no: "Grammatikkøvelse" },
  exerciseGrammarDrillDesc: { en: "Focus on a specific grammar rule with targeted exercises", no: "Fokuser på en bestemt grammatikkregel med målrettede øvelser" },
  exerciseTopicPractice: { en: "Topic Practice", no: "Temaøvelse" },
  exerciseTopicPracticeDesc: { en: "Practice vocabulary and phrases around a specific topic", no: "Øv på ordforråd og fraser rundt et bestemt tema" },
};

const TOPIC_LABELS: Record<string, string> = {
  topicIntroductions: "Introducing Yourself 👋",
  topicDailyRoutines: "Daily Routines ☀️",
  topicFoodDrink: "Food & Drink 🍽️",
  topicShopping: "Shopping 🛒",
  topicTravel: "Travel & Directions 🗺️",
  topicWeather: "Weather 🌤️",
  topicHobbies: "Hobbies & Sports ⚽",
  topicWork: "Work & Jobs 💼",
  topicHealth: "Health & Body 🏥",
  topicHousing: "Housing & Home 🏠",
  topicCulture: "Culture & Traditions 🎭",
  topicEnvironment: "Environment 🌍",
  topicTechnology: "Technology 💻",
  topicEducation: "Education 📚",
};

const GRAMMAR_LABELS: Record<string, string> = {
  grammarPresent: "Present Tense (presens)",
  grammarPast: "Past Tense (preteritum)",
  grammarArticles: "Articles & Gender (en/ei/et)",
  grammarV2: "V2 Word Order",
  grammarAdjectives: "Adjective Agreement",
  grammarModals: "Modal Verbs (kan, vil, skal...)",
  grammarPrepositions: "Prepositions (i, på, til...)",
  grammarPassive: "Passive Voice",
  grammarConditional: "Conditional (hvis/hadde)",
  grammarRelativeClauses: "Relative Clauses (som, der)",
};

export default function ExercisePicker({ cefrLevel, onSelect }: ExercisePickerProps) {
  const [step, setStep] = useState<Step>("mode");
  const [selectedMode, setSelectedMode] = useState<ExerciseMode | null>(null);

  const handleModeSelect = (mode: ExerciseMode) => {
    if (mode === "topic_practice") {
      setSelectedMode(mode);
      setStep("topic");
    } else if (mode === "grammar_drill") {
      setSelectedMode(mode);
      setStep("grammar");
    } else {
      onSelect(mode);
    }
  };

  const handleTopicSelect = (topicId: string) => {
    onSelect(selectedMode!, topicId);
  };

  const handleBack = () => {
    setStep("mode");
    setSelectedMode(null);
  };

  if (step === "topic") {
    const topics = getTopicsForLevel(cefrLevel);
    return (
      <div className="exercise-picker">
        <button type="button" className="exercise-back-btn" onClick={handleBack}>
          ← Back
        </button>
        <h3 className="exercise-picker-title">Choose a topic</h3>
        <div className="exercise-grid">
          {topics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className="exercise-card exercise-card-small"
              onClick={() => handleTopicSelect(topic.id)}
            >
              <span className="exercise-icon">{topic.icon}</span>
              <span className="exercise-label">{TOPIC_LABELS[topic.labelKey] ?? topic.id}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "grammar") {
    const grammarTopics = getGrammarTopicsForLevel(cefrLevel);
    return (
      <div className="exercise-picker">
        <button type="button" className="exercise-back-btn" onClick={handleBack}>
          ← Back
        </button>
        <h3 className="exercise-picker-title">Choose a grammar focus</h3>
        <div className="exercise-grid">
          {grammarTopics.map((gt) => (
            <button
              key={gt.id}
              type="button"
              className="exercise-card exercise-card-small"
              onClick={() => handleTopicSelect(gt.id)}
            >
              <span className="exercise-icon">📝</span>
              <span className="exercise-label">{GRAMMAR_LABELS[gt.labelKey] ?? gt.id}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="exercise-picker">
      <h3 className="exercise-picker-title">How would you like to practice?</h3>
      <p className="exercise-picker-subtitle">Choose an exercise mode to get started</p>
      <div className="exercise-grid">
        {EXERCISE_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className="exercise-card"
            onClick={() => handleModeSelect(mode.id)}
          >
            <span className="exercise-icon">{mode.icon}</span>
            <span className="exercise-label">
              {EXERCISE_LABELS[mode.labelKey]?.en ?? mode.id}
            </span>
            <span className="exercise-desc">
              {EXERCISE_LABELS[mode.descKey]?.en ?? ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
