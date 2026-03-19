import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildInitialQuestionPrompt } from "@/lib/conversation-prompts";
import { config } from "@/lib/config";
import { sanitizeCEFRLevel, sanitizeLanguageCode } from "@/lib/input-sanitization";
import { AppError, ErrorType, createAppError, reportErrorToSentry } from "@/lib/error-handling";
import { rateLimit } from "@/lib/rate-limiting";
import { setLanguageContext } from "@/sentry.server.config";
import { LanguageCode } from "@/lib/languages";
import { createLogger } from "@/lib/logger";

const log = createLogger("InitialQuestionAPI");

// Initialize Gemini AI - use env var directly as fallback for build compatibility
const getGeminiApiKey = () => {
  // Try process.env first to avoid config validation issues
  let key = process.env.GEMINI_API_KEY || '';
  
  // If not in process.env, try config (but don't fail if config throws)
  if (!key) {
    try {
      key = config.gemini.apiKey || '';
    } catch (configError) {
      log.error('Config access failed, using process.env only:', configError);
    }
  }
  
  if (!key) {
    log.error('GEMINI_API_KEY is not set in process.env or config!');
    throw new Error('GEMINI_API_KEY is required');
  }
  
  return key;
};

// Lazy initialization - only create when needed
let genAI: GoogleGenerativeAI | null = null;
const getGenAI = () => {
  if (!genAI) {
    const apiKey = getGeminiApiKey();
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const rateLimitResult = await rateLimit(ip);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
        }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          code: "INVALID_BODY",
        },
        { status: 400 }
      );
    }

    const { cefrLevel: rawCefrLevel, language: rawLanguage = "en" } = body;

    // Sanitize and validate inputs
    let cefrLevel: string;
    let language: string;

    try {
      cefrLevel = sanitizeCEFRLevel(rawCefrLevel);
      language = sanitizeLanguageCode(rawLanguage);
    } catch (validationError) {
      return NextResponse.json(
        {
          error: validationError instanceof Error 
            ? validationError.message 
            : "Invalid input",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const prompt = buildInitialQuestionPrompt(cefrLevel, language);
    try {
      log.debug('Starting Gemini API call...');
      const ai = getGenAI();
      
      const model = ai.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
      log.debug('Model initialized, prompt length:', prompt.length);
      
      const result = await model.generateContent(
        `Respond with JSON only.\n${prompt}`,
      );
      
      const responseText = result.response.text();
      log.info('Response received, length:', responseText?.length || 0);

      if (!responseText) {
        throw new Error("No response from Gemini");
      }

      // Extract JSON from markdown code blocks if present
      let jsonText = responseText.trim();
      
      // Remove markdown code block markers
      if (jsonText.startsWith("```")) {
        const lines = jsonText.split("\n");
        // Remove first line (```json or ```)
        lines.shift();
        // Remove last line (```) if present
        const lastLine = lines[lines.length - 1];
        if (lines.length > 0 && lastLine && lastLine.trim() === "```") {
          lines.pop();
        }
        jsonText = lines.join("\n");
      }
      
      // Try to extract JSON object if wrapped in other text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch (parseError) {
        throw new AppError(
          ErrorType.API,
          "Invalid JSON response from AI",
          "PARSE_ERROR",
          true,
          parseError
        );
      }

      return NextResponse.json(parsed);
    } catch (apiError: any) {
      // Safely extract error information without circular references
      const errorInfo: any = {
        message: apiError?.message,
        status: apiError?.status,
        statusText: apiError?.statusText,
        code: apiError?.code,
        name: apiError?.name,
      };
      
      // Only include stack if it's a string
      if (typeof apiError?.stack === 'string') {
        errorInfo.stack = apiError.stack;
      }
      
      // Only include cause if it's serializable
      if (apiError?.cause && typeof apiError.cause === 'object') {
        try {
          errorInfo.cause = {
            message: apiError.cause?.message,
            name: apiError.cause?.name,
          };
        } catch {
          // Ignore if cause can't be serialized
        }
      }
      
      log.error('Gemini API error caught:', errorInfo);
      throw apiError;
    }
  } catch (error) {
    // Safe error logging helper to prevent serialization crashes
    const safeError = (err: unknown) => {
      if (err instanceof Error) {
        return { 
          name: err.name, 
          message: err.message, 
          stack: err.stack,
          ...(err as any).code && { code: (err as any).code },
          ...(err as any).status && { status: (err as any).status },
        };
      }
      try {
        return JSON.parse(JSON.stringify(err));
      } catch {
        return { type: typeof err, value: String(err) };
      }
    };

    const errorInfo = safeError(error);
    log.error("Top-level error caught:", errorInfo);
    
    // Handle AppError
    if (error instanceof AppError) {
      log.error("AppError details:", {
        type: error.type,
        code: error.code,
        message: error.message,
        retryable: error.retryable,
        ...(error.originalError ? { originalError: safeError(error.originalError) } : {})
      });
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          type: error.type,
          retryable: error.retryable,
          // Include original error message for debugging in development
          ...(process.env.NODE_ENV === 'development' && error.originalError instanceof Error ? {
            originalError: error.originalError.message
          } : {})
        },
        {
          status: error.type === ErrorType.VALIDATION ? 400 : 500
        }
      );
    }
    
    // Convert unknown errors to AppError
    // Try to get language from header (set by middleware) or default to 'en'
    const language: LanguageCode = (request.headers.get('x-locale') as LanguageCode) || 'en';
    
    // Set language context for Sentry before creating error
    if (language) {
      setLanguageContext(language);
    }
    
    const appError = createAppError(error, language);
    
    // Report to Sentry
    reportErrorToSentry(appError, language);
    
    log.error("Converted to AppError:", {
      type: appError.type,
      code: appError.code,
      message: appError.message,
      retryable: appError.retryable
    });
    return NextResponse.json(
      {
        error: appError.message,
        code: appError.code,
        type: appError.type,
        retryable: appError.retryable,
        // Include original error for debugging in development
        ...(process.env.NODE_ENV === 'development' ? {
          originalError: error instanceof Error ? error.message : String(error)
        } : {})
      },
      { status: 500 }
    );
  }
}

