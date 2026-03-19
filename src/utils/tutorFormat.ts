import { LanguageCode } from "@/lib/languages";

type Labels = {
  corrected: string;
  topFixes: string;
  showAllFixes: (n: number) => string;
  nextQuestion: string;
};

const LABELS: Record<LanguageCode, Labels> = {
  en: {
    corrected: "Corrected",
    topFixes: "Top fixes",
    showAllFixes: (n) => `Show all fixes (${n})`,
    nextQuestion: "Next question",
  },
  no: {
    corrected: "Korrigert",
    topFixes: "Viktigste rettelser",
    showAllFixes: (n) => `Vis alle rettelser (${n})`,
    nextQuestion: "Neste spørsmål",
  },
  de: {
    corrected: "Korrigiert",
    topFixes: "Wichtigste Korrekturen",
    showAllFixes: (n) => `Alle Korrekturen anzeigen (${n})`,
    nextQuestion: "Nächste Frage",
  },
  fr: {
    corrected: "Correction",
    topFixes: "Principales corrections",
    showAllFixes: (n) => `Afficher toutes les corrections (${n})`,
    nextQuestion: "Question suivante",
  },
  es: {
    corrected: "Corrección",
    topFixes: "Correcciones principales",
    showAllFixes: (n) => `Mostrar todas las correcciones (${n})`,
    nextQuestion: "Siguiente pregunta",
  },
  it: {
    corrected: "Correzione",
    topFixes: "Correzioni principali",
    showAllFixes: (n) => `Mostra tutte le correzioni (${n})`,
    nextQuestion: "Prossima domanda",
  },
  pt: {
    corrected: "Correção",
    topFixes: "Principais correções",
    showAllFixes: (n) => `Mostrar todas as correções (${n})`,
    nextQuestion: "Próxima pergunta",
  },
  nl: {
    corrected: "Correctie",
    topFixes: "Belangrijkste verbeteringen",
    showAllFixes: (n) => `Alle verbeteringen tonen (${n})`,
    nextQuestion: "Volgende vraag",
  },
  sv: {
    corrected: "Korrigering",
    topFixes: "Viktigaste korrigeringarna",
    showAllFixes: (n) => `Visa alla korrigeringar (${n})`,
    nextQuestion: "Nästa fråga",
  },
  da: {
    corrected: "Rettelse",
    topFixes: "Vigtigste rettelser",
    showAllFixes: (n) => `Vis alle rettelser (${n})`,
    nextQuestion: "Næste spørgsmål",
  },
  fi: {
    corrected: "Korjaus",
    topFixes: "Tärkeimmät korjaukset",
    showAllFixes: (n) => `Näytä kaikki korjaukset (${n})`,
    nextQuestion: "Seuraava kysymys",
  },
  pl: {
    corrected: "Poprawka",
    topFixes: "Najważniejsze poprawki",
    showAllFixes: (n) => `Pokaż wszystkie poprawki (${n})`,
    nextQuestion: "Następne pytanie",
  },
  uk: {
    corrected: "Виправлення",
    topFixes: "Головні виправлення",
    showAllFixes: (n) => `Показати всі виправлення (${n})`,
    nextQuestion: "Наступне запитання",
  },
};

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const severityOrder: Record<string, number> = { must_fix: 0, should_fix: 1, suggestion: 2 };

const sortFixes = (fixes: any[]) =>
  [...fixes].sort((a, b) => {
    const sa = severityOrder[a?.severity] ?? 9;
    const sb = severityOrder[b?.severity] ?? 9;
    if (sa !== sb) return sa - sb;
    const ca = typeof a?.ruleConfidence === "number" ? a.ruleConfidence : 0;
    const cb = typeof b?.ruleConfidence === "number" ? b.ruleConfidence : 0;
    return cb - ca;
  });

const renderFix = (fix: any) => {
  const severity = typeof fix?.severity === "string" ? fix.severity : "should_fix";
  const category = typeof fix?.category === "string" ? fix.category : "other";
  const explanation = typeof fix?.explanation === "string" ? fix.explanation : "";
  const replacement = typeof fix?.replacement === "string" ? fix.replacement : "";

  const firstEvidence = Array.isArray(fix?.evidence) ? fix.evidence[0] : undefined;
  const original = typeof firstEvidence?.original === "string" ? firstEvidence.original : "";
  const corrected = typeof firstEvidence?.corrected === "string" ? firstEvidence.corrected : "";
  const arrowTo = replacement || corrected;
  const head = arrowTo
    ? `“${escapeHtml(original)}” → “${escapeHtml(arrowTo)}”`
    : `“${escapeHtml(original)}”`;

  const expl = explanation ? `: ${escapeHtml(explanation)}` : "";
  return `<li><span class="tutor-tag tutor-tag-${escapeHtml(severity)}">${escapeHtml(severity)}</span> <span class="tutor-tag tutor-tag-cat">${escapeHtml(category)}</span> ${head}${expl}</li>`;
};

export const formatTutorAssistantMessage = (
  data: any,
  uiLanguage: LanguageCode,
  opts?: { previewCount?: number }
) => {
  const labels = LABELS[uiLanguage] ?? LABELS.en;
  const previewCount = opts?.previewCount ?? 3;

  // New schema
  const fixesRaw = Array.isArray(data?.fixes) ? data.fixes : [];
  const fixes = sortFixes(fixesRaw);
  const improvedVersion = typeof data?.improvedVersion === "string" ? data.improvedVersion : "";
  const summary = typeof data?.summary === "string" ? data.summary : "";
  const nextQuestion = typeof data?.nextQuestion === "string" ? data.nextQuestion : "";

  // Legacy fallback
  const legacyHasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const legacyCorrection = typeof data?.correction === "string" ? data.correction : "";
  const legacyExplanation = typeof data?.explanation === "string" ? data.explanation : "";
  const legacyPraise = typeof data?.praise === "string" ? data.praise : "";

  const parts: string[] = [];
  parts.push(`<div class="tutor-msg">`);

  const correctedLine = improvedVersion || (legacyHasError ? legacyCorrection : "");
  if (correctedLine) {
    parts.push(
      `<div class="tutor-section tutor-corrected"><strong>${escapeHtml(labels.corrected)}:</strong> ${escapeHtml(
        correctedLine
      )}</div>`
    );
  }

  const summaryLine = summary || (legacyHasError ? legacyExplanation : legacyPraise);
  if (summaryLine) {
    parts.push(`<div class="tutor-section tutor-summary">${escapeHtml(summaryLine)}</div>`);
  }

  if (fixes.length > 0) {
    const preview = fixes.slice(0, Math.min(previewCount, fixes.length));
    parts.push(`<div class="tutor-section tutor-fixes">`);
    parts.push(`<div class="tutor-fixes-title"><strong>${escapeHtml(labels.topFixes)}:</strong></div>`);
    parts.push(`<ul class="tutor-fixes-list">${preview.map(renderFix).join("")}</ul>`);

    if (fixes.length > preview.length) {
      parts.push(
        `<details class="tutor-details"><summary class="tutor-details-summary">${escapeHtml(
          labels.showAllFixes(fixes.length)
        )}</summary><ul class="tutor-fixes-list tutor-fixes-list-all">${fixes.map(renderFix).join("")}</ul></details>`
      );
    }

    parts.push(`</div>`);
  }

  // Vocabulary introduced this turn (topic practice mode)
  const vocabIntroduced = Array.isArray(data?.vocabIntroduced) ? data.vocabIntroduced : [];
  if (vocabIntroduced.length > 0) {
    parts.push(`<div class="tutor-section tutor-vocab"><strong>New vocabulary:</strong><ul class="tutor-vocab-list">`);
    for (const v of vocabIntroduced) {
      if (typeof v?.word === "string" && typeof v?.translation === "string") {
        parts.push(`<li><strong>${escapeHtml(v.word)}</strong> — ${escapeHtml(v.translation)}</li>`);
      }
    }
    parts.push(`</ul></div>`);
  }

  if (nextQuestion) {
    parts.push(
      `<div class="tutor-section tutor-next"><strong>${escapeHtml(labels.nextQuestion)}:</strong> ${escapeHtml(
        nextQuestion
      )}</div>`
    );
  }

  // Hint for next question
  const hint = typeof data?.hint === "string" ? data.hint : "";
  if (hint) {
    parts.push(
      `<div class="tutor-section tutor-hint"><em>💡 ${escapeHtml(hint)}</em></div>`
    );
  }

  parts.push(`</div>`);
  return parts.join("");
};


