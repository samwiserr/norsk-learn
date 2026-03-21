"use client";

import { useAppSetupGate } from "@/src/hooks/useAppSetupGate";
import { SpeakingSessionView } from "@/src/components/speaking/SpeakingSessionView";
import { useSpeakingSessionController } from "@/src/components/speaking/useSpeakingSessionController";

export default function SpeakingPage() {
  const ready = useAppSetupGate("speaking");
  const c = useSpeakingSessionController();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  return (
    <SpeakingSessionView
      status={c.status}
      audioLevel={c.audioLevel}
      transcripts={c.transcripts}
      error={c.error}
      outputMuted={c.outputMuted}
      setOutputMuted={c.setOutputMuted}
      outputVolume={c.outputVolume}
      setOutputVolume={c.setOutputVolume}
      pushToTalk={c.pushToTalk}
      setPushToTalk={c.setPushToTalk}
      assessmentMode={c.assessmentMode}
      setAssessmentMode={c.setAssessmentMode}
      referenceText={c.referenceText}
      setReferenceText={c.setReferenceText}
      scores={c.scores}
      cefrLevel={c.cefrLevel}
      onStart={c.handleStart}
      onStop={c.handleStop}
      scrollRef={c.scrollRef}
    />
  );
}
