import "server-only";

export { normalizeAiToTutorResponse, applySafetyFilters } from "@/lib/tutor-runtime";

export const cleanJsonResponse = (text: string): string => {
  let jsonText = text.trim();

  if (jsonText.startsWith("```")) {
    const lines = jsonText.split("\n");
    lines.shift();
    const lastLine = lines[lines.length - 1];
    if (lines.length > 0 && lastLine && lastLine.trim() === "```") {
      lines.pop();
    }
    jsonText = lines.join("\n");
  }

  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }

  return jsonText;
};
