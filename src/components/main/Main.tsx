"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { VirtuosoHandle } from "react-virtuoso";
import "./main.css";
import { useSessionContext } from "@/src/context/SessionContext";
import { useLanguageContext } from "@/src/context/LanguageContext";
import ProgressBar from "@/src/components/ProgressBar";
import { getTranslation } from "@/lib/languages";
import AuthModal from "@/src/components/auth/AuthModal";
import { AuthNudgeBanner } from "@/src/components/auth/AuthNudgeBanner";
import { CUSTOM_EVENTS, SESSION_STORAGE_KEYS } from "@/lib/constants";
import type { ExerciseMode } from "@/lib/exercise-modes";
import { MODE_LABELS } from "./mainUtils";
import { MainChatHeader } from "./MainChatHeader";
import { MainExerciseBar } from "./MainExerciseBar";
import { MainMessageArea } from "./MainMessageArea";
import { MainComposer } from "./MainComposer";
import { Button } from "@/src/components/ui/button";

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

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const inputElRef = useRef<HTMLInputElement>(null);
  const [localInput, setLocalInput] = useState("");
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAuthNudge, setShowAuthNudge] = useState(false);
  const [speakingFallbackMsg, setSpeakingFallbackMsg] = useState<string | null>(null);
  const [summaryDismissedAt, setSummaryDismissedAt] = useState(0);

  const messages = activeSession?.messages ?? [];
  /** Welcome / tutor-only turns should not hide the exercise picker — user must still choose a mode. */
  const hasUserMessage = messages.some((m) => m.role === "user");
  const shouldShowPicker = !exerciseMode && !!cefrLevel && !hasUserMessage;
  const inputGated = shouldShowPicker;
  const SUMMARY_INTERVAL = 5;
  const shouldShowSummary = Boolean(
    exerciseMode &&
      exerciseTurns > 0 &&
      exerciseTurns % SUMMARY_INTERVAL === 0 &&
      exerciseTurns !== summaryDismissedAt &&
      !loading,
  );

  useEffect(() => {
    const handleAuthRequired = () => setShowAuthModal(true);
    const handleAuthNudge = () => setShowAuthNudge(true);
    window.addEventListener(CUSTOM_EVENTS.AUTH_REQUIRED, handleAuthRequired);
    window.addEventListener(CUSTOM_EVENTS.AUTH_NUDGE, handleAuthNudge);
    return () => {
      window.removeEventListener(CUSTOM_EVENTS.AUTH_REQUIRED, handleAuthRequired);
      window.removeEventListener(CUSTOM_EVENTS.AUTH_NUDGE, handleAuthNudge);
    };
  }, []);

  useEffect(() => {
    const msg = sessionStorage.getItem(SESSION_STORAGE_KEYS.SPEAKING_FALLBACK_NOTICE);
    if (msg) {
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.SPEAKING_FALLBACK_NOTICE);
      setSpeakingFallbackMsg(msg);
    }
  }, []);

  const handleAtBottomChange = useCallback(
    (bottom: boolean) => {
      setAtBottom(bottom);
      setShowJumpToBottom(!bottom && messages.length > 0);
    },
    [messages.length],
  );

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

  const lastAssistantHadFixes =
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant" &&
    messages[messages.length - 1]?.content?.includes("tutor-tag-must_fix");

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
      <MainChatHeader
        onMenuClick={onMenuClick}
        title={t("appTitle")}
        subtitle={t("greetingSubtitle")}
        changeLevelLabel={t("changeLevel")}
        onChangeLevel={() => router.push("/level-selection")}
      />

      <ProgressBar />

      {showAuthNudge && (
        <AuthNudgeBanner
          title={t("authNudgeTitle")}
          body={t("authNudgeBody")}
          signInLabel={t("authNudgeSignIn")}
          dismissLabel={t("authNudgeDismiss")}
          onDismiss={() => setShowAuthNudge(false)}
        />
      )}

      {speakingFallbackMsg && (
        <div
          className="mx-3 mt-3 flex flex-col gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm sm:mx-4 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p className="text-foreground">{speakingFallbackMsg}</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSpeakingFallbackMsg(null)}>
            {t("progressionDismiss")}
          </Button>
        </div>
      )}

      {exerciseModeLabel && (
        <MainExerciseBar
          label={exerciseModeLabel}
          exerciseScore={exerciseScore}
          exerciseTurns={exerciseTurns}
          scoreBadgeSuffix={t("exerciseCorrectLabel")}
          newExerciseLabel={t("newExercise")}
          onNewExercise={newChat}
        />
      )}

      <div className="chat-area-wrapper">
        <div className="chat-area">
          <MainMessageArea
            virtuosoRef={virtuosoRef}
            messages={messages}
            cefrLevel={cefrLevel}
            shouldShowPicker={shouldShowPicker}
            onExerciseSelect={handleExerciseSelect}
            welcomeTitle={t("welcomeTitle")}
            selectLevelSubtitle={t("selectLevelSubtitle")}
            atBottomStateChange={handleAtBottomChange}
            lastAssistantHadFixes={!!lastAssistantHadFixes}
            loading={loading}
            onRetry={retryLastMessage}
            tryAgainLabel={t("tryAgain")}
            lastTutorHint={lastTutorHint ?? null}
            shouldShowSummary={shouldShowSummary}
            exerciseMode={exerciseMode}
            exerciseScore={exerciseScore}
            exerciseTurns={exerciseTurns}
            onSummaryContinue={() => setSummaryDismissedAt(exerciseTurns)}
            onNewExercise={newChat}
            showJumpToBottom={showJumpToBottom}
            onJumpToBottom={jumpToBottom}
            jumpToBottomLabel={t("jumpToBottom")}
          />

          <MainComposer
            inputRef={inputElRef}
            value={localInput}
            onChange={setLocalInput}
            onKeyDown={handleKeyPress}
            onSend={handleSend}
            placeholder={inputGated ? t("selectExerciseToBegin") : t("placeholder")}
            disclaimer={t("disclaimer")}
            disabled={loading}
            gated={inputGated}
            canSend={!!localInput.trim()}
          />
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
