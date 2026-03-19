export type ExerciseMode =
  | "free_conversation"
  | "translation"
  | "grammar_drill"
  | "topic_practice";

export interface ExerciseModeInfo {
  id: ExerciseMode;
  icon: string;
  labelKey: string;
  descKey: string;
}

export const EXERCISE_MODES: ExerciseModeInfo[] = [
  {
    id: "free_conversation",
    icon: "💬",
    labelKey: "exerciseFreeConversation",
    descKey: "exerciseFreeConversationDesc",
  },
  {
    id: "translation",
    icon: "🔄",
    labelKey: "exerciseTranslation",
    descKey: "exerciseTranslationDesc",
  },
  {
    id: "grammar_drill",
    icon: "📝",
    labelKey: "exerciseGrammarDrill",
    descKey: "exerciseGrammarDrillDesc",
  },
  {
    id: "topic_practice",
    icon: "🎯",
    labelKey: "exerciseTopicPractice",
    descKey: "exerciseTopicPracticeDesc",
  },
];

export interface TopicInfo {
  id: string;
  icon: string;
  labelKey: string;
  cefrLevels: string[];
}

export const TOPICS: TopicInfo[] = [
  { id: "introducing_yourself", icon: "👋", labelKey: "topicIntroductions", cefrLevels: ["A1", "A2"] },
  { id: "daily_routines", icon: "☀️", labelKey: "topicDailyRoutines", cefrLevels: ["A1", "A2"] },
  { id: "food_and_drink", icon: "🍽️", labelKey: "topicFoodDrink", cefrLevels: ["A1", "A2", "B1"] },
  { id: "shopping", icon: "🛒", labelKey: "topicShopping", cefrLevels: ["A2", "B1"] },
  { id: "travel_directions", icon: "🗺️", labelKey: "topicTravel", cefrLevels: ["A2", "B1"] },
  { id: "weather", icon: "🌤️", labelKey: "topicWeather", cefrLevels: ["A1", "A2", "B1"] },
  { id: "hobbies", icon: "⚽", labelKey: "topicHobbies", cefrLevels: ["A2", "B1"] },
  { id: "work_and_jobs", icon: "💼", labelKey: "topicWork", cefrLevels: ["B1", "B2"] },
  { id: "health", icon: "🏥", labelKey: "topicHealth", cefrLevels: ["A2", "B1", "B2"] },
  { id: "housing", icon: "🏠", labelKey: "topicHousing", cefrLevels: ["B1", "B2"] },
  { id: "culture_traditions", icon: "🎭", labelKey: "topicCulture", cefrLevels: ["B1", "B2"] },
  { id: "environment", icon: "🌍", labelKey: "topicEnvironment", cefrLevels: ["B2"] },
  { id: "technology", icon: "💻", labelKey: "topicTechnology", cefrLevels: ["B1", "B2"] },
  { id: "education", icon: "📚", labelKey: "topicEducation", cefrLevels: ["B1", "B2"] },
];

export interface GrammarTopic {
  id: string;
  labelKey: string;
  cefrLevels: string[];
}

export const GRAMMAR_TOPICS: GrammarTopic[] = [
  { id: "present_tense", labelKey: "grammarPresent", cefrLevels: ["A1", "A2"] },
  { id: "past_tense", labelKey: "grammarPast", cefrLevels: ["A2", "B1"] },
  { id: "articles_gender", labelKey: "grammarArticles", cefrLevels: ["A1", "A2"] },
  { id: "word_order_v2", labelKey: "grammarV2", cefrLevels: ["A2", "B1"] },
  { id: "adjective_agreement", labelKey: "grammarAdjectives", cefrLevels: ["A2", "B1"] },
  { id: "modal_verbs", labelKey: "grammarModals", cefrLevels: ["A2", "B1"] },
  { id: "prepositions", labelKey: "grammarPrepositions", cefrLevels: ["A2", "B1", "B2"] },
  { id: "passive_voice", labelKey: "grammarPassive", cefrLevels: ["B1", "B2"] },
  { id: "subjunctive_conditional", labelKey: "grammarConditional", cefrLevels: ["B1", "B2"] },
  { id: "relative_clauses", labelKey: "grammarRelativeClauses", cefrLevels: ["B1", "B2"] },
];

export function getTopicsForLevel(cefrLevel: string): TopicInfo[] {
  return TOPICS.filter((t) => t.cefrLevels.includes(cefrLevel));
}

export function getGrammarTopicsForLevel(cefrLevel: string): GrammarTopic[] {
  return GRAMMAR_TOPICS.filter((t) => t.cefrLevels.includes(cefrLevel));
}
