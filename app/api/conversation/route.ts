import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildConversationPrompt } from "@/lib/conversation-prompts";
import { AppError, ErrorType, createAppError } from "@/lib/error-handling";
import { withRetry, isRetryableError } from "@/lib/retry";
import { config } from "@/lib/config";
import {
  sanitizeUserMessage,
  sanitizeCEFRLevel,
  sanitizeLanguageCode,
} from "@/lib/input-sanitization";
import { rateLimit } from "@/lib/rate-limiting";

// Initialize Gemini AI - use env var directly as fallback for build compatibility
const getGeminiApiKey = () => {
  try {
    return config.gemini.apiKey || process.env.GEMINI_API_KEY || '';
  } catch {
    return process.env.GEMINI_API_KEY || '';
  }
};

const genAI = new GoogleGenerativeAI(getGeminiApiKey());

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const rateLimitResult = await rateLimit(ip);
    
    if (!rateLimitResult.success) {
      const maxRequests = (() => {
        try {
          return config.rateLimit.maxRequests;
        } catch {
          return 100; // fallback
        }
      })();
      
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          type: ErrorType.VALIDATION,
          retryable: false,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
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
          type: ErrorType.VALIDATION,
          retryable: false,
        },
        { status: 400 }
      );
    }

    const {
      userInput: rawUserInput,
      cefrLevel: rawCefrLevel,
      currentProgress = 0,
      language: rawLanguage = "en",
      conversationHistory = [],
    } = body;

    // Sanitize and validate inputs
    let userInput: string;
    let cefrLevel: string;
    let language: string;

    try {
      userInput = sanitizeUserMessage(rawUserInput);
      cefrLevel = sanitizeCEFRLevel(rawCefrLevel);
      language = sanitizeLanguageCode(rawLanguage);
    } catch (validationError) {
      return NextResponse.json(
        {
          error: validationError instanceof Error 
            ? validationError.message 
            : "Invalid input",
          code: "VALIDATION_ERROR",
          type: ErrorType.VALIDATION,
          retryable: false,
        },
        { status: 400 }
      );
    }

    // Validate progress is a number
    if (typeof currentProgress !== 'number' || currentProgress < 0 || currentProgress > 100) {
      return NextResponse.json(
        {
          error: "Invalid currentProgress. Must be a number between 0 and 100",
          code: "VALIDATION_ERROR",
          type: ErrorType.VALIDATION,
          retryable: false,
        },
        { status: 400 }
      );
    }

    // Validate conversation history is an array
    if (!Array.isArray(conversationHistory)) {
      return NextResponse.json(
        {
          error: "Invalid conversationHistory. Must be an array",
          code: "VALIDATION_ERROR",
          type: ErrorType.VALIDATION,
          retryable: false,
        },
        { status: 400 }
      );
    }

    const prompt = buildConversationPrompt({
      userInput,
      cefrLevel,
      currentProgress,
      language,
      conversationHistory,
    });

    // Retry logic for API calls
    const result = await withRetry(
      async () => {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(
          `Return ONLY JSON.\n${prompt}`
        );
        return result.response.text();
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
        retryable: isRetryableError,
      }
    );

    if (!result) {
      throw new AppError(
        ErrorType.API,
        "No response from AI model",
        "EMPTY_RESPONSE",
        true
      );
    }

    // Extract JSON from markdown code blocks
    let jsonText = result.trim();
    
    if (jsonText.startsWith("```")) {
      const lines = jsonText.split("\n");
      lines.shift();
      if (lines.length > 0 && lines[lines.length - 1].trim() === "```") {
        lines.pop();
      }
      jsonText = lines.join("\n");
    }
    
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

    // Validate response structure
    if (typeof parsed.hasError !== "boolean" || !parsed.nextQuestion) {
      throw new AppError(
        ErrorType.API,
        "Invalid response structure from AI",
        "INVALID_STRUCTURE",
        true
      );
    }

    return NextResponse.json(parsed);
    
  } catch (error) {
    console.error("Conversation API error:", error);
    
    // Handle AppError
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          type: error.type,
          retryable: error.retryable,
        },
        { 
          status: error.type === ErrorType.VALIDATION ? 400 : 500 
        }
      );
    }
    
    // Convert unknown errors to AppError
    const appError = createAppError(error);
    return NextResponse.json(
      {
        error: appError.message,
        code: appError.code,
        type: appError.type,
        retryable: appError.retryable,
      },
      { status: 500 }
    );
  }
}