"use client";

import { useEffect, useState, useRef } from "react";
import { Mic, ArrowLeft, StopCircle, Zap, Volume2, VolumeX, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRealtimeTutor } from "@/src/hooks/useRealtimeTutor";
import { usePronunciation } from "@/src/hooks/usePronunciation";
import { useLanguageContext } from "@/src/context/LanguageContext";
import { useSessionContext } from "@/src/context/SessionContext";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

export default function SpeakingPage() {
    const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "speaking" | "listening" | "error">("idle");
    const [audioLevel, setAudioLevel] = useState(0);
    const [transcripts, setTranscripts] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [outputMuted, setOutputMuted] = useState(false);
    const [outputVolume, setOutputVolume] = useState(1);
    const [pushToTalk, setPushToTalk] = useState(false);
    const [assessmentMode, setAssessmentMode] = useState<"conversation" | "drill">("conversation");
    const [referenceText, setReferenceText] = useState("");
    const learnerName = "Student";

    // Pronunciation State
    const [scores, setScores] = useState({ accuracy: 0, fluency: 0, completeness: 0 });

    const { language } = useLanguageContext();
    const { cefrLevel: contextLevel } = useSessionContext();
    const cefrLevel = contextLevel || "A1";
    const userLanguageName = SUPPORTED_LANGUAGES.find(l => l.code === language)?.name || "English";

    const { startSession, disconnect, setOutputMuted: applyMute, setOutputVolume: applyVolume } = useRealtimeTutor({
        onTranscript: (role, text) => {
            setTranscripts(prev => [...prev, { role, text }]);
        },
        onAudioLevel: (level) => setAudioLevel(level), // 0-255 from hook
        onStatusChange: (s) => {
            setStatus(s);
            if (s !== "error") setError(null);
        },
    });

    const { startAssessment, stopAssessment } = usePronunciation({
        onScore: (accuracy, fluency, completeness) => {
            setScores({ accuracy, fluency, completeness });
        }
    });

    const renderTutorText = (text: string) => {
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
    };

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
        } catch (err: any) {
            setError(err?.message || "Failed to start speaking session");
        }
    };

    const handleStop = () => {
        disconnect();
        stopAssessment();
        setStatus("idle");
    };

    // Auto-scroll transcripts
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

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden transition-colors duration-1000">
            {/* Dynamic Background */}
            <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-100"
                style={{
                    background: status === "listening"
                        ? `radial-gradient(circle at center, rgba(59, 130, 246, ${audioLevel / 300}) 0%, transparent 70%)`
                        : status === "speaking"
                            ? `radial-gradient(circle at center, rgba(16, 185, 129, ${audioLevel / 300}) 0%, transparent 70%)`
                            : 'none'
                }}
            />

            {/* Header */}
            <div className="p-4 flex items-center justify-between z-10">
                <Link href="/" className="p-2 rounded-full hover:bg-secondary transition-colors" onClick={handleStop}>
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="font-semibold text-lg flex items-center gap-2">
                    Realtime Tutor <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Beta</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> {status}</span>
                </div>
                {/* Live Score Indicator + volume */}
                <div className="flex items-center gap-4 text-xs font-medium">
                    <div className="flex flex-col items-center">
                        <span className="text-muted-foreground">Accuracy</span>
                        <span className="text-emerald-600">{Math.round(scores.accuracy)}%</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-muted-foreground">Fluency</span>
                        <span className="text-blue-600">{Math.round(scores.fluency)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setOutputMuted(!outputMuted)}
                            className="p-2 rounded-full hover:bg-secondary transition-colors"
                            aria-label="Toggle output mute"
                        >
                            {outputMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={outputVolume}
                            onChange={(e) => setOutputVolume(parseFloat(e.target.value))}
                            className="w-24"
                            aria-label="Output volume"
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8 z-10 w-full max-w-2xl mx-auto">

                {/* Visualizer / Status */}
                <div className="relative group flex items-center justify-center">
                    {(status === "listening" || status === "speaking" || status === "connected") && (
                        <div
                            className={cn("absolute rounded-full transition-all duration-75 ease-out opacity-20",
                                status === "listening" ? "bg-blue-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${140 + audioLevel}px`, height: `${140 + audioLevel}px` }}
                        />
                    )}

                    <button
                        onClick={status === "idle" ? handleStart : handleStop}
                        disabled={status === "connecting"}
                        className={cn(
                            "relative z-10 w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95",
                            status === "idle" ? "bg-gradient-to-br from-gray-800 to-black text-white" :
                                status === "error" ? "bg-red-600 text-white" :
                                    status === "connecting" ? "bg-yellow-500 text-white" :
                                        "bg-white text-gray-900 border-4 border-gray-100"
                        )}
                    >
                        {status === "idle" ? <Mic className="w-12 h-12" /> :
                            status === "connecting" ? <Zap className="w-12 h-12 animate-pulse" /> :
                                <StopCircle className="w-12 h-12 text-red-500" />}
                    </button>
                </div>

                <div className="h-8 text-center">
                    <div className="text-muted-foreground font-medium animate-fade-in uppercase tracking-wider text-sm flex flex-col items-center gap-1">
                        <p>
                            {status === "idle" && "Tap to Start Session"}
                            {status === "connecting" && "Connecting..."}
                            {status === "connected" && "Ready / Listening"}
                            {status === "listening" && "Listening..."}
                            {status === "speaking" && "Tutor Speaking..."}
                            {status === "error" && "Error - check mic or network"}
                        </p>
                        <div className="text-xs lowercase normal-case flex items-center gap-2">
                            <label className="flex items-center gap-1">
                                <input
                                    type="checkbox"
                                    checked={pushToTalk}
                                    onChange={(e) => setPushToTalk(e.target.checked)}
                                />
                                Push-to-talk
                            </label>
                        </div>
                    </div>
                </div>

                <div className="w-full bg-white/70 border border-black/5 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="assessmentMode"
                                value="conversation"
                                checked={assessmentMode === "conversation"}
                                onChange={() => setAssessmentMode("conversation")}
                            />
                            Conversation scoring
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="assessmentMode"
                                value="drill"
                                checked={assessmentMode === "drill"}
                                onChange={() => setAssessmentMode("drill")}
                            />
                            Drill mode (read-aloud)
                        </label>
                    </div>
                    {assessmentMode === "drill" && (
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-muted-foreground">Reference sentence</label>
                            <textarea
                                value={referenceText}
                                onChange={(e) => setReferenceText(e.target.value)}
                                placeholder="Skriv en kort setning på bokmål her..."
                                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm"
                                rows={3}
                            />
                        </div>
                    )}
                </div>

                {/* Live Transcript Log */}
                <div
                    ref={scrollRef}
                    className="w-full h-64 overflow-y-auto space-y-4 p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-black/5 mask-gradient-b"
                >
                    {transcripts.length === 0 && (
                        <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">
                            Conversation history will appear here...
                        </div>
                    )}
                    {transcripts.map((t, i) => (
                        <div key={i} className={cn("flex flex-col gap-1", t.role === "user" ? "items-end" : "items-start")}>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                {t.role === "user" ? "You" : "Tutor"}
                            </span>
                            <div className={cn(
                                "px-4 py-2 rounded-2xl max-w-[80%] text-sm",
                                t.role === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-100 text-gray-800 rounded-bl-none"
                            )}>
                                {t.role === "assistant" ? renderTutorText(t.text) : t.text}
                            </div>
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="w-full max-w-2xl text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
