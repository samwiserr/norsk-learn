import { CEFRLevel } from "./cefr";
import { LanguageCode, getTranslation, type Translations } from "./languages";

export const getTranslatedCEFRLevelInfo = (
  level: CEFRLevel,
  language: LanguageCode,
) => {
  const translationKeyMap: Record<CEFRLevel, { nameKey: keyof Translations; descKey: keyof Translations }> = {
    A1: { nameKey: "levelA1", descKey: "levelA1Desc" },
    A2: { nameKey: "levelA2", descKey: "levelA2Desc" },
    B1: { nameKey: "levelB1", descKey: "levelB1Desc" },
    B2: { nameKey: "levelB2", descKey: "levelB2Desc" },
    C1: { nameKey: "levelC1", descKey: "levelC1Desc" },
    C2: { nameKey: "levelC2", descKey: "levelC2Desc" },
  };
  
  const keys = translationKeyMap[level];
  return {
    name: getTranslation(language, keys.nameKey),
    description: getTranslation(language, keys.descKey),
  };
};

