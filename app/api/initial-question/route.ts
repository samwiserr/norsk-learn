import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildInitialQuestionPrompt } from "@/lib/conversation-prompts";
import { config } from "@/lib/config";
import { sanitizeCEFRLevel, sanitizeLanguageCode } from "@/lib/input-sanitization";
import { AppError, ErrorType, createAppError } from "@/lib/error-handling";
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(
      `Respond with JSON only.\n${prompt}`,
    );
    const responseText = result.response.text();

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
      if (lines.length > 0 && lines[lines.length - 1].trim() === "```") {
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
  } catch (error) {
    console.error("Initial question error:", error);
    
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

