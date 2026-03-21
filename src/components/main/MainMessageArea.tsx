"use client";

import { useCallback } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import type { RefObject } from "react";
import SafeHtml from "@/src/components/SafeHtml";
import ExercisePicker from "@/src/components/writing/ExercisePicker";
import ExerciseSummary from "@/src/components/writing/ExerciseSummary";
import { Message } from "@/lib/sessions";
import type { ExerciseMode } from "@/lib/exercise-modes";

interface MainMessageAreaProps {
  virtuosoRef: RefObject<VirtuosoHandle | null>;
  messages: Message[];
  cefrLevel: string | null;
  shouldShowPicker: boolean;
  onExerciseSelect: (mode: ExerciseMode, topicId?: string) => void;
  welcomeTitle: string;
  selectLevelSubtitle: string;
  followOutput?: "smooth" | "auto" | false;
  atBottomStateChange: (atBottom: boolean) => void;
  lastAssistantHadFixes: boolean;
  loading: boolean;
  onRetry: () => void;
  tryAgainLabel: string;
  lastTutorHint: string | null;
  shouldShowSummary: boolean;
  exerciseMode: string | null;
  exerciseScore: number;
  exerciseTurns: number;
  onSummaryContinue: () => void;
  onNewExercise: () => void;
  showJumpToBottom: boolean;
  onJumpToBottom: () => void;
  jumpToBottomLabel: string;
}

export function MainMessageArea({
  virtuosoRef,
  messages,
  cefrLevel,
  shouldShowPicker,
  onExerciseSelect,
  welcomeTitle,
  selectLevelSubtitle,
  followOutput = "smooth",
  atBottomStateChange,
  lastAssistantHadFixes,
  loading,
  onRetry,
  tryAgainLabel,
  lastTutorHint,
  shouldShowSummary,
  exerciseMode,
  exerciseScore,
  exerciseTurns,
  onSummaryContinue,
  onNewExercise,
  showJumpToBottom,
  onJumpToBottom,
  jumpToBottomLabel,
}: MainMessageAreaProps) {
  const renderMessage = useCallback((_index: number, message: Message) => {
    const isStreaming = message.role === "assistant-streaming";
    const isUser = message.role === "user";
    return (
      <div
        className={`message-bubble ${isUser ? "user-message" : "ai-message"} ${isStreaming ? "streaming" : ""}`}
      >
        <div className="message-content">
          {isStreaming ? (
            <div className="loading-indicator" aria-hidden>
              <span />
              <span />
              <span />
            </div>
          ) : (
            <SafeHtml content={message.content.replace(/\n/g, "<br/>")} />
          )}
        </div>
      </div>
    );
  }, []);

  return (
    <div className="messages-container" aria-live="polite" aria-relevant="additions">
      {shouldShowPicker ? (
        <ExercisePicker cefrLevel={cefrLevel!} onSelect={onExerciseSelect} />
      ) : !cefrLevel ? (
        <div className="welcome-message">
          <h2>{welcomeTitle}</h2>
          <p>{selectLevelSubtitle}</p>
        </div>
      ) : messages.length > 0 ? (
        <>
          <Virtuoso
            ref={virtuosoRef}
            data={messages}
            itemContent={renderMessage}
            followOutput={followOutput}
            atBottomStateChange={atBottomStateChange}
            className="messages-list"
            style={{ flex: 1 }}
          />
          {lastAssistantHadFixes && !loading && (
            <div className="try-again-bar">
              <button type="button" className="try-again-btn" onClick={onRetry}>
                {tryAgainLabel}
              </button>
              {lastTutorHint ? <span className="try-again-hint">{lastTutorHint}</span> : null}
            </div>
          )}
          {shouldShowSummary && exerciseMode && (
            <ExerciseSummary
              score={exerciseScore}
              turns={exerciseTurns}
              exerciseMode={exerciseMode}
              onContinue={onSummaryContinue}
              onNewExercise={onNewExercise}
            />
          )}
        </>
      ) : null}
      {showJumpToBottom && (
        <button type="button" className="jump-to-bottom" onClick={onJumpToBottom} aria-label={jumpToBottomLabel}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8 12L4 8h8L8 12zm0-4L4 4h8L8 8z" />
          </svg>
          {jumpToBottomLabel}
        </button>
      )}
    </div>
  );
}
