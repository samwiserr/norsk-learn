"use client";

import type { RefObject } from "react";
import { Mic, ArrowLeft, StopCircle, Zap, Volume2, VolumeX, Clock } from "lucide-react";
import Link from "next/link";
import { getTranslation } from "@/lib/languages";
import { useLanguageContext } from "@/src/context/LanguageContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent } from "@/src/components/ui/card";
import { renderTutorTranscriptText, transcriptBubbleClass } from "./speakingRenderUtils";
import type { SpeakingConnectionStatus } from "./useSpeakingSessionController";

export interface SpeakingSessionViewProps {
  status: SpeakingConnectionStatus;
  audioLevel: number;
  transcripts: { role: "user" | "assistant"; text: string }[];
  error: string | null;
  outputMuted: boolean;
  setOutputMuted: (v: boolean) => void;
  outputVolume: number;
  setOutputVolume: (v: number) => void;
  pushToTalk: boolean;
  setPushToTalk: (v: boolean) => void;
  assessmentMode: "conversation" | "drill";
  setAssessmentMode: (m: "conversation" | "drill") => void;
  referenceText: string;
  setReferenceText: (t: string) => void;
  scores: { accuracy: number; fluency: number; completeness: number };
  cefrLevel: string;
  onStart: () => void;
  onStop: () => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}

function statusMessage(status: SpeakingConnectionStatus): string {
  switch (status) {
    case "idle":
      return "Tap to start session";
    case "connecting":
      return "Connecting…";
    case "connected":
      return "Ready — listening for audio";
    case "listening":
      return "Listening…";
    case "speaking":
      return "Tutor speaking…";
    case "error":
      return "Error — check microphone or network";
    default:
      return "";
  }
}

export function SpeakingSessionView({
  status,
  audioLevel,
  transcripts,
  error,
  outputMuted,
  setOutputMuted,
  outputVolume,
  setOutputVolume,
  pushToTalk,
  setPushToTalk,
  assessmentMode,
  setAssessmentMode,
  referenceText,
  setReferenceText,
  scores,
  cefrLevel,
  onStart,
  onStop,
  scrollRef,
}: SpeakingSessionViewProps) {
  const { language } = useLanguageContext();
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground transition-colors duration-1000">
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-100"
        aria-hidden
        style={{
          background:
            status === "listening"
              ? `radial-gradient(circle at center, rgba(59, 130, 246, ${audioLevel / 300}) 0%, transparent 70%)`
              : status === "speaking"
                ? `radial-gradient(circle at center, rgba(16, 185, 129, ${audioLevel / 300}) 0%, transparent 70%)`
                : "none",
        }}
      />

      <header className="z-10 flex items-center justify-between gap-2 p-4">
        <Link
          href="/"
          className="rounded-full p-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onStop}
          aria-label="Back to dashboard and stop session"
        >
          <ArrowLeft className="h-6 w-6" aria-hidden />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2">
          <div className="flex items-center gap-2 truncate font-semibold text-base sm:text-lg">
            <span className="truncate">Realtime Tutor</span>
            <Badge variant="secondary" className="shrink-0 text-xs">
              Beta
            </Badge>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" aria-hidden />
            <span className="capitalize">{status}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">CEFR {cefrLevel}</span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs font-medium">
          <div className="hidden flex-col items-center sm:flex">
            <span className="text-muted-foreground">Accuracy</span>
            <span className="text-emerald-600 dark:text-emerald-400">{Math.round(scores.accuracy)}%</span>
          </div>
          <div className="hidden flex-col items-center sm:flex">
            <span className="text-muted-foreground">Fluency</span>
            <span className="text-blue-600 dark:text-blue-400">{Math.round(scores.fluency)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOutputMuted(!outputMuted)}
              className="rounded-full p-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={outputMuted ? "Unmute tutor audio" : "Mute tutor audio"}
              aria-pressed={outputMuted}
            >
              {outputMuted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
            </button>
            <label className="sr-only" htmlFor="speaking-output-volume">
              Output volume
            </label>
            <input
              id="speaking-output-volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={outputVolume}
              onChange={(e) => setOutputVolume(parseFloat(e.target.value))}
              className="w-20 sm:w-24"
            />
          </div>
        </div>
      </header>

      <main className="z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 p-4 sm:gap-8 sm:p-6">
        <div className="relative flex items-center justify-center">
          {(status === "listening" || status === "speaking" || status === "connected") && (
            <div
              className={cn(
                "absolute rounded-full opacity-20 transition-all duration-75 ease-out",
                status === "listening" ? "bg-blue-500" : "bg-emerald-500",
              )}
              style={{ width: `${140 + audioLevel}px`, height: `${140 + audioLevel}px` }}
              aria-hidden
            />
          )}

          <button
            type="button"
            onClick={status === "idle" ? onStart : onStop}
            disabled={status === "connecting"}
            aria-busy={status === "connecting"}
            aria-pressed={status !== "idle" && status !== "error"}
            className={cn(
              "relative z-10 flex h-28 w-28 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring sm:h-32 sm:w-32",
              status === "idle"
                ? "bg-gradient-to-br from-gray-800 to-black text-white"
                : status === "error"
                  ? "bg-destructive text-destructive-foreground"
                  : status === "connecting"
                    ? "bg-yellow-500 text-white"
                    : "border-4 border-border bg-card text-foreground",
            )}
            aria-label={status === "idle" ? "Start speaking session" : "Stop speaking session"}
          >
            {status === "idle" ? (
              <Mic className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden />
            ) : status === "connecting" ? (
              <Zap className="h-10 w-10 animate-pulse sm:h-12 sm:w-12" aria-hidden />
            ) : (
              <StopCircle className="h-10 w-10 text-red-500 sm:h-12 sm:w-12" aria-hidden />
            )}
          </button>
        </div>

        <div
          className="min-h-8 text-center"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {statusMessage(status)}
          </p>
          <div className="mt-2 text-xs normal-case">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={pushToTalk}
                onChange={(e) => setPushToTalk(e.target.checked)}
                className="rounded border-input"
              />
              Push-to-talk (experimental)
            </label>
          </div>
        </div>

        <Card className="w-full border-border/80 bg-card/90 shadow-sm backdrop-blur-sm">
          <CardContent className="space-y-3 p-4">
            <fieldset className="space-y-2">
              <legend className="sr-only">Assessment mode</legend>
              <div className="flex flex-col gap-3 text-sm sm:flex-row sm:gap-6">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="assessmentMode"
                    value="conversation"
                    checked={assessmentMode === "conversation"}
                    onChange={() => setAssessmentMode("conversation")}
                    className="border-input"
                  />
                  Conversation scoring
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="assessmentMode"
                    value="drill"
                    checked={assessmentMode === "drill"}
                    onChange={() => setAssessmentMode("drill")}
                    className="border-input"
                  />
                  Drill mode (read-aloud)
                </label>
              </div>
            </fieldset>
            {assessmentMode === "drill" && (
              <div className="flex flex-col gap-2">
                <label htmlFor="speaking-reference-text" className="text-xs text-muted-foreground">
                  Reference sentence
                </label>
                <textarea
                  id="speaking-reference-text"
                  value={referenceText}
                  onChange={(e) => setReferenceText(e.target.value)}
                  placeholder="Skriv en kort setning på bokmål her…"
                  className="min-h-[5rem] w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={3}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <section
          aria-label="Live transcript"
          ref={scrollRef}
          className="h-56 w-full space-y-4 overflow-y-auto rounded-2xl border border-border bg-muted/40 p-4 backdrop-blur-sm sm:h-64"
        >
          {transcripts.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm italic text-muted-foreground">
              Conversation history will appear here…
            </div>
          ) : (
            transcripts.map((t, i) => (
              <div
                key={i}
                className={cn("flex flex-col gap-1", t.role === "user" ? "items-end" : "items-start")}
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t.role === "user" ? "You" : "Tutor"}
                </span>
                <div className={transcriptBubbleClass(t.role)}>
                  {t.role === "assistant" ? renderTutorTranscriptText(t.text) : t.text}
                </div>
              </div>
            ))
          )}
        </section>

        {error ? (
          <div
            role="alert"
            className="w-full rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <p className="font-medium">Something went wrong</p>
            <p className="mt-1">{error}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              {status === "idle" && (
                <button
                  type="button"
                  className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={onStart}
                >
                  Retry
                </button>
              )}
              <Link
                href="/writing"
                className="text-sm font-medium text-destructive underline underline-offset-2 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                {t("speakingContinueInWriting")}
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
