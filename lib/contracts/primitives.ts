import { z } from "zod";
import { CEFR_LEVELS } from "@/lib/cefr";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

const languageCodes = SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]];

/** Valid CEFR level string (A1–B2). */
export const cefrLevelSchema = z.enum(CEFR_LEVELS);

/** Supported UI / tutor language codes. */
export const languageCodeSchema = z.enum(languageCodes);

export type CefrLevelInput = z.infer<typeof cefrLevelSchema>;
export type LanguageCodeInput = z.infer<typeof languageCodeSchema>;
