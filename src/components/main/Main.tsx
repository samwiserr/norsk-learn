"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import "./main.css";
import { assets } from "@/src/assets/assets";
import { useSessionContext } from "@/src/context/SessionContext";
import { useLanguageContext } from "@/src/context/LanguageContext";
import ProgressBar from "@/src/components/ProgressBar";
import { getTranslation } from "@/lib/languages";
import AuthButtons from "@/src/components/auth/AuthButtons";
import AuthModal from "@/src/components/auth/AuthModal";
import SafeHtml from "@/src/components/SafeHtml";
import ExercisePicker from "@/src/components/writing/ExercisePicker";
import ExerciseSummary from "@/src/components/writing/ExerciseSummary";
import { Message } from "@/lib/sessions";
import type { ExerciseMode } from "@/lib/exercise-modes";

const getImageSrc = (image: string | { src?: string }) =>
  typeof image === "string" ? image : image?.src ?? "";

const MODE_LABELS: Record<string, string> = {
  free_conversation: "Free Conversation",
  translation: "Translation",
  grammar_drill: "Grammar Drill",
  topic_practice: "Topic Practice",
};

interface MainProps {
  onMenuClick?: () => void;
}

const Main = ({ onMenuClick }: MainProps) => {
  const router = useRouter();
  const {
    onSent,
    activeSession,
    loading,
    cefrLevel,
    isAuthRequired,
    exerciseMode,
    setExerciseMode,
    lastTutorHint,
    retryLastMessage,
    newChat,
    exerciseScore,
    exerciseTurns,
  } = useSessionContext();
  const { language } = useLanguageContext();

  const t = (key: any) => getTranslation(language, key);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const inputElRef = useRef<HTMLInputElement | null>(null);
  const [localInput, setLocalInput] = useState("");
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [summaryDismissedAt, setSummaryDismissedAt] = useState(0);

  const messages = activeSession?.messages ?? [];

  const shouldShowPicker = !exerciseMode && messages.length === 0 && !!cefrLevel;
  const inputGated = shouldShowPicker;
  const SUMMARY_INTERVAL = 5;
  const shouldShowSummary =
    exerciseMode &&
    exerciseTurns > 0 &&
    exerciseTurns % SUMMARY_INTERVAL === 0 &&
    exerciseTurns !== summaryDismissedAt &&
    !loading;

  useEffect(() => {
    const handleAuthRequired = () => setShowAuthModal(true);
    window.addEventListener("auth-required", handleAuthRequired);
    return () => window.removeEventListener("auth-required", handleAuthRequired);
  }, []);

  const handleAtBottomChange = useCallback((bottom: boolean) => {
    setAtBottom(bottom);
    setShowJumpToBottom(!bottom && messages.length > 0);
  }, [messages.length]);

  useEffect(() => {
    if (atBottom && messages.length > 0) {
      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, behavior: "smooth" });
      });
    }
  }, [messages.length, loading, atBottom]);

  const jumpToBottom = () => {
    virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, behavior: "smooth" });
    setShowJumpToBottom(false);
  };

  const handleExerciseSelect = (mode: ExerciseMode, topicId?: string) => {
    setExerciseMode(mode, topicId);
  };

  const lastAssistantHadFixes = messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant" &&
    messages[messages.length - 1]?.content?.includes("tutor-tag-must_fix");

  const renderMessage = useCallback((_index: number, message: Message) => {
    const isStreaming = message.role === "assistant-streaming";
    const isUser = message.role === "user";
    return (
      <div
        className={`message-bubble ${isUser ? "user-message" : "ai-message"} ${isStreaming ? "streaming" : ""}`}
      >
        <div className="message-content">
          {isStreaming ? (
            <div className="loading-indicator">
              <span></span><span></span><span></span>
            </div>
          ) : (
            <SafeHtml content={message.content.replace(/\n/g, "<br/>")} />
          )}
        </div>
      </div>
    );
  }, []);

  const handleSend = () => {
    const raw = localInput.trim() || inputElRef.current?.value?.trim() || "";
    if (!raw) return;
    if (!cefrLevel) {
      router.push("/level-selection");
      return;
    }
    onSent(raw);
    setLocalInput("");
    requestAnimationFrame(() => {
      virtuosoRef.current?.scrollToIndex({ index: "LAST", behavior: "smooth" });
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const exerciseModeLabel = exerciseMode ? (MODE_LABELS[exerciseMode] ?? exerciseMode) : null;

  return (
    <div className="main-chat-container" id="main-content" role="main">
      <div className="chat-header">
        <div className="chat-header-left">
          {onMenuClick && (
            <button type="button" className="menu-button" onClick={onMenuClick} aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 4h16M2 10h16M2 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="chat-header-title">{t("appTitle")}</h1>
            <p className="chat-header-subtitle">{t("greetingSubtitle")}</p>
          </div>
        </div>
        <div className="chat-header-right">
          <AuthButtons />
          <button type="button" className="header-button" onClick={() => router.push("/level-selection")}>
            {t("changeLevel")}
          </button>
        </div>
      </div>

      <ProgressBar />

      {exerciseModeLabel && (
        <div className="exercise-mode-bar">
          <span className="exercise-mode-label">{exerciseModeLabel}</span>
          {exerciseTurns > 0 && (
            <span className="exercise-score-badge">
              {exerciseScore}/{exerciseTurns} correct
            </span>
          )}
          <button type="button" className="exercise-mode-change" onClick={newChat}>
            New Exercise
          </button>
        </div>
      )}

      <div className="chat-area-wrapper">
        <div className="chat-area">
          <div className="messages-container" aria-live="polite" aria-relevant="additions">
            {shouldShowPicker ? (
              <ExercisePicker cefrLevel={cefrLevel} onSelect={handleExerciseSelect} />
            ) : !cefrLevel ? (
              <div className="welcome-message">
                <h2>{t("welcomeTitle")}</h2>
                <p>{t("selectLevelSubtitle")}</p>
              </div>
            ) : messages.length > 0 ? (
              <>
                <Virtuoso
                  ref={virtuosoRef}
                  data={messages}
                  itemContent={renderMessage}
                  followOutput="smooth"
                  atBottomStateChange={handleAtBottomChange}
                  className="messages-list"
                  style={{ flex: 1 }}
                />
                {lastAssistantHadFixes && !loading && (
                  <div className="try-again-bar">
                    <button type="button" className="try-again-btn" onClick={retryLastMessage}>
                      Try again
                    </button>
                    {lastTutorHint && (
                      <span className="try-again-hint">{lastTutorHint}</span>
                    )}
                  </div>
                )}
                {shouldShowSummary && exerciseMode && (
                  <ExerciseSummary
                    score={exerciseScore}
                    turns={exerciseTurns}
                    exerciseMode={exerciseMode}
                    onContinue={() => setSummaryDismissedAt(exerciseTurns)}
                    onNewExercise={newChat}
                  />
                )}
              </>
            ) : null}
            {showJumpToBottom && (
              <button type="button" className="jump-to-bottom" onClick={jumpToBottom} aria-label={t("jumpToBottom")}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 12L4 8h8L8 12zm0-4L4 4h8L8 8z" />
                </svg>
                {t("jumpToBottom")}
              </button>
            )}
          </div>

          <div className={`input-container ${inputGated ? "input-gated" : ""}`}>
            <div className="input-wrapper">
              <input
                type="text"
                className="message-input"
                ref={inputElRef}
                value={localInput}
                onChange={(e) => setLocalInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={inputGated ? "Select an exercise mode above to begin..." : t("placeholder")}
                disabled={loading || inputGated}
              />
              <div className="input-actions">
                <button
                  type="button"
                  className="send-button"
                  onClick={handleSend}
                  disabled={!localInput.trim() || loading || inputGated}
                  aria-label="Send"
                >
                  <img src={getImageSrc(assets.send_icon)} alt="Send" width={20} height={20} />
                </button>
              </div>
            </div>
            {!inputGated && <p className="input-disclaimer">{t("disclaimer")}</p>}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        isRequired={isAuthRequired}
      />
    </div>
  );
};

export default Main;
