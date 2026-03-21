"use client";

import { useEffect, useRef, useState } from "react";
import { useRealtimeTutor } from "@/src/hooks/useRealtimeTutor";
import { usePronunciation } from "@/src/hooks/usePronunciation";
import { useLanguageContext } from "@/src/context/LanguageContext";
import { useSessionContext } from "@/src/context/SessionContext";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

export type SpeakingConnectionStatus = "idle" | "connecting" | "connected" | "speaking" | "listening" | "error";

export function useSpeakingSessionController() {
  const [status, setStatus] = useState<SpeakingConnectionStatus>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcripts, setTranscripts] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [outputMuted, setOutputMuted] = useState(false);
  const [outputVolume, setOutputVolume] = useState(1);
  const [pushToTalk, setPushToTalk] = useState(false);
  const [assessmentMode, setAssessmentMode] = useState<"conversation" | "drill">("conversation");
  const [referenceText, setReferenceText] = useState("");
  const learnerName = "Student";

  const [scores, setScores] = useState({ accuracy: 0, fluency: 0, completeness: 0 });
  const transcriptsRef = useRef(transcripts);
  const scoresRef = useRef(scores);
  useEffect(() => {
    transcriptsRef.current = transcripts;
  }, [transcripts]);
  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  const { language } = useLanguageContext();
  const { cefrLevel: contextLevel, recordSpeakingPractice } = useSessionContext();
  const cefrLevel = contextLevel || "A1";
  const userLanguageName = SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name || "English";

  const { startSession, disconnect, setOutputMuted: applyMute, setOutputVolume: applyVolume } = useRealtimeTutor({
    onTranscript: (role, text) => {
      setTranscripts((prev) => [...prev, { role, text }]);
    },
    onAudioLevel: (level) => setAudioLevel(level),
    onStatusChange: (s) => {
      setStatus(s);
      if (s !== "error") setError(null);
    },
  });

  const { startAssessment, stopAssessment } = usePronunciation({
    onScore: (accuracy, fluency, completeness) => {
      setScores({ accuracy, fluency, completeness });
    },
  });

  const handleStart = async () => {
    try {
      setError(null);
      if (assessmentMode === "drill" && !referenceText.trim()) {
        setError("Please enter a reference sentence for drill mode.");
        return;
      }
      await startSession("Norwegian Bokmål", {
        cefrLevel,
        learnerName,
        uiLanguage: userLanguageName,
      });
      await startAssessment({
        language: "nb-NO",
        mode: assessmentMode,
        referenceText: referenceText.trim(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start speaking session";
      setError(message);
      try {
        disconnect();
        stopAssessment();
      } catch {
        // ignore cleanup errors
      }
      setStatus("idle");
    }
  };

  const handleStop = () => {
    const t = transcriptsRef.current;
    if (t.length > 0) {
      recordSpeakingPractice(t, scoresRef.current);
    }
    disconnect();
    stopAssessment();
    setStatus("idle");
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  useEffect(() => {
    applyMute(outputMuted);
  }, [outputMuted, applyMute]);

  useEffect(() => {
    applyVolume(outputVolume);
  }, [outputVolume, applyVolume]);

  return {
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
    handleStart,
    handleStop,
    scrollRef,
  };
}
