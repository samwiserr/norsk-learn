import { cn } from "@/lib/utils";

export function renderTutorTranscriptText(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length >= 2) {
    return (
      <div className="space-y-1">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Explanation</span>{" "}
          <span>{lines[0]}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Repeat</span>{" "}
          <span>{lines[1]}</span>
        </div>
      </div>
    );
  }
  return text;
}

export function transcriptBubbleClass(role: "user" | "assistant") {
  return cn(
    "px-4 py-2 rounded-2xl max-w-[80%] text-sm",
    role === "user"
      ? "bg-primary text-primary-foreground rounded-br-none"
      : "bg-muted text-foreground rounded-bl-none",
  );
}
