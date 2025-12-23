import { getCurrentCEFRLevel } from "./cefr-progress";

export const buildInitialQuestionPrompt = (
  cefrLevel: string,
  language = "en",
) => {
  const levelQuestions: Record<string, string> = {
    A1: "Hei, hva heter du?",
    A2: "Hvor bor du, og hvem bor du sammen med?",
    B1: "Kan du fortelle meg om en interessant opplevelse du hadde nylig?",
    B2: "Hva er din mening om viktigheten av å lære et nytt språk?",
    C1: "Diskuter hvordan teknologi har påvirket dagens samfunn og hverdagsliv.",
    C2: "Analyser sammenhengen mellom kultur og språk, og hvordan de påvirker hverandre.",
  };

  const selectedQuestion = levelQuestions[cefrLevel] ?? levelQuestions.A1;

  return `You are a Professional Norwegian Bokmål CEFR Examiner. The user has selected CEFR level ${cefrLevel}.

Generate a JSON response with a complete welcome message that MUST include the first question as part of the introduction.

Requirements:
1. Write a welcoming greeting in language "${language}"
2. Mention that they have selected CEFR level ${cefrLevel}
3. Remind them to answer in Norwegian Bokmål
4. Include the first question directly in the welcome message (DO NOT say "the following question" without including it)

The first question for level ${cefrLevel} is: "${selectedQuestion}"

JSON format:
{
  "welcomeMessage": "Complete welcome message that includes the greeting, level mention, instruction to answer in Norwegian, AND the actual question. The question MUST be included in this message.",
  "firstQuestion": "${selectedQuestion}"
}

Example format for English (localize for language "${language}"):
"Welcome! You have selected CEFR level ${cefrLevel}. Please answer the following question in Norwegian Bokmål: ${selectedQuestion}"

IMPORTANT: The welcomeMessage MUST contain the actual question text (${selectedQuestion}), not just a reference to it.

Return ONLY the JSON, no additional text.`;
};

export const buildConversationPrompt = ({
  userInput,
  cefrLevel,
  currentProgress,
  language = "en",
  conversationHistory = [],
}: {
  userInput: string;
  cefrLevel: string;
  currentProgress: number;
  language?: string;
  conversationHistory: { role: string; content: string }[];
}) => {
  const currentLevel = getCurrentCEFRLevel(currentProgress);
  const formattedHistory = conversationHistory
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n");

  const languageMap: Record<string, string> = {
    en: "English",
    no: "Norwegian",
    de: "German",
    fr: "French",
    es: "Spanish",
    it: "Italian",
    pt: "Portuguese",
    nl: "Dutch",
    sv: "Swedish",
    da: "Danish",
    fi: "Finnish",
    pl: "Polish",
    uk: "Ukrainian",
  };
  
  const selectedLanguageName = languageMap[language] || "English";

  return `You are a Professional Norwegian Bokmål CEFR Examiner.

Assessment Criteria:
1. Fluency
2. Coherence
3. Vocabulary range
4. Grammatical accuracy
5. Ability to address the question

Context:
- Selected level: ${cefrLevel}
- Current progress level: ${currentLevel}
- User response: "${userInput}"
- Conversation history (context only, do not repeat):
${formattedHistory}
- User interface language: ${selectedLanguageName} (${language})

CRITICAL LANGUAGE RULES:
1. ALL explanations, corrections, praise, and feedback MUST be written in ${selectedLanguageName} (language code: ${language}).
2. The corrected Norwegian sentence (if needed) should be provided, but the EXPLANATION of what was wrong must be in ${selectedLanguageName}.
3. Questions (nextQuestion) should always be in Norwegian Bokmål (the target language being learned).
4. DO NOT mix languages in explanations - use ONLY ${selectedLanguageName} for all explanations and feedback.

Task:
1. Analyze the user response.
2. If there are mistakes:
   - Provide a corrected version in Norwegian Bokmål
   - Explain the mistake in ${selectedLanguageName} (${language}) - describe what was wrong and why
   - Then continue with a logical next question in Norwegian Bokmål related to the topic
3. If the response is good:
   - Provide praise in ${selectedLanguageName} (${language})
   - Continue with the next logical question in Norwegian Bokmål
4. Determine a progressDelta (range -2.0 to 2.0, easier to lose than gain).
5. If user answered in English or another language, remind them in ${selectedLanguageName} to use Norwegian Bokmål.

Return STRICT JSON:
{
  "hasError": boolean,
  "correction": "string - corrected sentence in Norwegian Bokmål (if error exists)",
  "explanation": "string - explanation in ${selectedLanguageName} (${language}) describing what was wrong and why",
  "praise": "string - praise in ${selectedLanguageName} (${language}) if response is good",
  "nextQuestion": "string - next question in Norwegian Bokmål",
  "progressDelta": number
}

CRITICAL LANGUAGE REQUIREMENTS:
- "explanation" field: MUST be written entirely in ${selectedLanguageName} (${language}), NOT in Norwegian. This field explains grammar mistakes, corrections, or feedback.
- "correction" field: The corrected sentence in Norwegian Bokmål (this is the target language being learned).
- "praise" field: MUST be written in ${selectedLanguageName} (${language}), NOT in Norwegian.
- "nextQuestion" field: Always in Norwegian Bokmål (the target language).

DO NOT write explanations in Norwegian unless the selected language IS Norwegian (${language} === "no"). 
For all other languages, explanations MUST be in ${selectedLanguageName}.

Return ONLY the JSON.`;
};

