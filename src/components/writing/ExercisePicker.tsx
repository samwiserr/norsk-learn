"use client";

import { useState } from "react";
import {
  EXERCISE_MODES,
  getTopicsForLevel,
  getGrammarTopicsForLevel,
  type ExerciseMode,
} from "@/lib/exercise-modes";
import { useLanguageContext } from "@/src/context/LanguageContext";
import { getTranslation, type LanguageCode, type Translations } from "@/lib/languages";
import { cn } from "@/lib/utils";

interface ExercisePickerProps {
  cefrLevel: string;
  onSelect: (mode: ExerciseMode, topicId?: string) => void;
}

type Step = "mode" | "topic" | "grammar";

type LabelRow = Partial<Record<LanguageCode, string>> & { en: string };

const EXERCISE_LABELS: Record<string, LabelRow> = {
  exerciseFreeConversation: { en: "Free Conversation", no: "Fri samtale" },
  exerciseFreeConversationDesc: {
    en: "Chat freely with the tutor about anything",
    no: "Snakk fritt med veilederen om hva som helst",
  },
  exerciseTranslation: { en: "Translation Practice", no: "Oversettelsesøvelse" },
  exerciseTranslationDesc: {
    en: "Translate sentences between your language and Norwegian",
    no: "Oversett setninger mellom språket ditt og norsk",
  },
  exerciseGrammarDrill: { en: "Grammar Drill", no: "Grammatikkøvelse" },
  exerciseGrammarDrillDesc: {
    en: "Focus on a specific grammar rule with targeted exercises",
    no: "Fokuser på en bestemt grammatikkregel med målrettede øvelser",
  },
  exerciseTopicPractice: { en: "Topic Practice", no: "Temaøvelse" },
  exerciseTopicPracticeDesc: {
    en: "Practice vocabulary and phrases around a specific topic",
    no: "Øv på ordforråd og fraser rundt et bestemt tema",
  },
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

function pickLabel(row: LabelRow | undefined, lang: LanguageCode): string {
  if (!row) return "";
  return row[lang] ?? row.en;
}

export default function ExercisePicker({ cefrLevel, onSelect }: ExercisePickerProps) {
  const { language } = useLanguageContext();
  const t = (key: keyof Translations) => getTranslation(language, key);

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

  const shellClass = cn("mx-auto flex w-full max-w-xl flex-col items-stretch px-4 py-8 sm:px-6");

  const gridClass = "grid w-full grid-cols-1 gap-3 sm:grid-cols-2";

  const cardBtnClass = cn(
    "flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 text-center shadow-sm transition-all",
    "hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "active:scale-[0.99]",
  );

  const smallCardBtnClass = cn(
    cardBtnClass,
    "flex-row justify-start gap-3 p-4 text-left",
  );

  if (step === "topic") {
    const topics = getTopicsForLevel(cefrLevel);
    return (
      <div className={shellClass}>
        <button
          type="button"
          className="mb-4 self-start text-sm font-medium text-primary hover:underline"
          onClick={handleBack}
        >
          ← {t("back")}
        </button>
        <h3 className="mb-1 text-lg font-semibold text-foreground">{t("exerciseChooseTopic")}</h3>
        <div className={cn(gridClass, "mt-4")}>
          {topics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={smallCardBtnClass}
              onClick={() => handleTopicSelect(topic.id)}
            >
              <span className="text-xl shrink-0" aria-hidden>
                {topic.icon}
              </span>
              <span className="font-semibold text-sm text-foreground">
                {TOPIC_LABELS[topic.labelKey] ?? topic.id}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "grammar") {
    const grammarTopics = getGrammarTopicsForLevel(cefrLevel);
    return (
      <div className={shellClass}>
        <button
          type="button"
          className="mb-4 self-start text-sm font-medium text-primary hover:underline"
          onClick={handleBack}
        >
          ← {t("back")}
        </button>
        <h3 className="mb-1 text-lg font-semibold text-foreground">{t("exerciseChooseGrammar")}</h3>
        <div className={cn(gridClass, "mt-4")}>
          {grammarTopics.map((gt) => (
            <button
              key={gt.id}
              type="button"
              className={smallCardBtnClass}
              onClick={() => handleTopicSelect(gt.id)}
            >
              <span className="text-lg shrink-0" aria-hidden>
                📝
              </span>
              <span className="font-semibold text-sm text-foreground">
                {GRAMMAR_LABELS[gt.labelKey] ?? gt.id}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <h3 className="text-center text-lg font-semibold text-foreground sm:text-xl">{t("exerciseHowPractice")}</h3>
      <p className="mb-6 text-center text-sm text-muted-foreground">{t("exerciseChooseModeSubtitle")}</p>
      <div className={gridClass}>
        {EXERCISE_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={cardBtnClass}
            onClick={() => handleModeSelect(mode.id)}
          >
            <span className="text-2xl" aria-hidden>
              {mode.icon}
            </span>
            <span className="font-semibold text-foreground">{pickLabel(EXERCISE_LABELS[mode.labelKey], language)}</span>
            <span className="text-xs leading-snug text-muted-foreground">
              {pickLabel(EXERCISE_LABELS[mode.descKey], language)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
