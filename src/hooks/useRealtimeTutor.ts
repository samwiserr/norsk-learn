import { useCallback, useRef, useState } from "react";
import { addBreadcrumb, captureException } from "@sentry/nextjs";
import { buildRealtimeTutorPrompt } from "@/lib/conversation-prompts";

interface RealtimeTutorConfig {
    onTranscript: (role: "user" | "assistant", text: string) => void;
    onAudioLevel: (level: number) => void;
    onStatusChange: (status: "idle" | "connecting" | "connected" | "speaking" | "listening" | "error") => void;
}

type TutorStatus = "idle" | "connecting" | "connected" | "speaking" | "listening" | "error";

const STUN = [{ urls: "stun:stun.l.google.com:19302" }];
const BETA_HEADER = "realtime=v1";

export function useRealtimeTutor(config: RealtimeTutorConfig) {
    const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const audioElRef = useRef<HTMLAudioElement | null>(null);
    const analyserIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const cleanup = useCallback(() => {
        analyserIntervalRef.current && clearInterval(analyserIntervalRef.current);
        analyserIntervalRef.current = null;

        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => undefined);
            audioContextRef.current = null;
        }

        if (audioElRef.current) {
            audioElRef.current.srcObject = null;
            audioElRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }

        if (pcRef.current) {
            pcRef.current.getSenders().forEach((s) => s.track?.stop());
            pcRef.current.getReceivers().forEach((r) => r.track?.stop());
            pcRef.current.close();
            pcRef.current = null;
        }
        setDataChannel(null);
    }, []);

    const setupAudioMeter = useCallback((stream: MediaStream) => {
        if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return;
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        analyserIntervalRef.current = setInterval(() => {
            analyser.getByteTimeDomainData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const value = (dataArray[i] ?? 128) - 128;
                sum += value * value;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            const level = Math.min(255, Math.max(0, Math.round(rms * 4)));
            config.onAudioLevel(level);
        }, 100);
    }, [config]);

    const handleDcMessage = useCallback((event: MessageEvent) => {
        try {
            const payload = JSON.parse(event.data);
            const type = payload?.type;
            if (type === "response.audio_transcript.delta" || type === "response.audio_transcript.done") {
                const text = payload?.transcript ?? payload?.output_text ?? "";
                if (text) {
                    config.onTranscript("assistant", text);
                }
            }
            if (type === "response.output_text.delta" || type === "response.output_text.done") {
                const text = payload?.text ?? "";
                if (text) config.onTranscript("assistant", text);
            }
            if (type === "input_audio_buffer.speech_started") {
                config.onStatusChange("listening");
            }
            if (type === "response.audio.delta" || type === "response.audio.done") {
                config.onStatusChange("speaking");
            }
            if (type === "session.updated") {
                config.onStatusChange("connected");
            }
        } catch (err) {
            // non-critical parse failure on a realtime chunk
        }
    }, [config]);

    const startSession = useCallback(async (userLanguage: string, options: { cefrLevel?: string; learnerName?: string; uiLanguage?: string } = {}) => {
        cleanup();
        const setStatus = (status: TutorStatus) => config.onStatusChange(status);
        const cefrLevel = options.cefrLevel || "A1";
        const learnerName = options.learnerName || "Student";
        const uiLanguage = options.uiLanguage || "en";
        try {
            setStatus("connecting");
            addBreadcrumb({
                category: "realtime",
                message: "startSession called",
                level: "info",
                data: { userLanguage, cefrLevel, uiLanguage },
            });

            const tokenRes = await fetch("/api/openai-realtime", { method: "POST" });
            if (!tokenRes.ok) {
                const detail = await tokenRes.json().catch(() => ({}));
                throw new Error(detail.error || "Failed to fetch realtime token");
            }
            const tokenData = await tokenRes.json();
            const clientSecret = tokenData.client_secret?.value || tokenData.client_secret;
            const model = tokenData.model;
            if (!clientSecret) {
                throw new Error("Missing client_secret from token response");
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            localStreamRef.current = stream;
            setupAudioMeter(stream);
            addBreadcrumb({
                category: "realtime",
                message: "Microphone stream acquired",
                level: "info",
            });

            const pc = new RTCPeerConnection({ iceServers: STUN });
            pcRef.current = pc;
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            pc.ontrack = (e) => {
                if (!audioElRef.current) {
                    audioElRef.current = new Audio();
                    audioElRef.current.autoplay = true;
                }
                const [remoteStream] = e.streams;
                audioElRef.current.srcObject = remoteStream ?? null;
                audioElRef.current.play().catch(() => undefined);
            };
            pc.onconnectionstatechange = () => {
                addBreadcrumb({
                    category: "realtime",
                    message: "Peer connection state",
                    level: "info",
                    data: { state: pc.connectionState },
                });
                if (pc.connectionState === "failed") {
                    setStatus("error");
                }
            };
            pc.oniceconnectionstatechange = () => {
                addBreadcrumb({
                    category: "realtime",
                    message: "ICE connection state",
                    level: "info",
                    data: { state: pc.iceConnectionState },
                });
            };

            const dc = pc.createDataChannel("oai-events");
            setDataChannel(dc);

            dc.onopen = () => {
                setStatus("connected");
                const instructions = buildRealtimeTutorPrompt({
                    cefrLevel,
                    learnerName,
                    uiLanguage,
                });
                dc.send(JSON.stringify({
                    type: "session.update",
                    session: {
                        modalities: ["text", "audio"],
                        instructions,
                        input_audio_format: "pcm16",
                        output_audio_format: "pcm16",
                        turn_detection: { type: "server_vad" },
                    },
                }));
                addBreadcrumb({
                    category: "realtime",
                    message: "Data channel opened",
                    level: "info",
                });
            };
            dc.onmessage = handleDcMessage;
            dc.onerror = () => {
                addBreadcrumb({
                    category: "realtime",
                    message: "Data channel error",
                    level: "error",
                });
                setStatus("error");
            };
            dc.onclose = () => {
                addBreadcrumb({
                    category: "realtime",
                    message: "Data channel closed",
                    level: "info",
                });
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const answerResp = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${clientSecret}`,
                    "Content-Type": "application/sdp",
                    "OpenAI-Beta": BETA_HEADER,
                },
                body: offer.sdp || undefined,
            });

            if (!answerResp.ok) {
                const detail = await answerResp.text();
                throw new Error(`OpenAI Realtime handshake failed: ${detail.slice(0, 300)}`);
            }

            const answerSdp = await answerResp.text();
            await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
            setStatus("listening");
            addBreadcrumb({
                category: "realtime",
                message: "WebRTC handshake complete",
                level: "info",
            });
        } catch (error) {
            // startSession error handled by state update below
            captureException(error);
            setStatus("error");
            cleanup();
            throw error;
        }
    }, [cleanup, config, handleDcMessage, setupAudioMeter]);

    const disconnect = useCallback(() => {
        cleanup();
        config.onStatusChange("idle");
    }, [cleanup, config]);

    const setOutputMuted = useCallback((muted: boolean) => {
        if (audioElRef.current) {
            audioElRef.current.muted = muted;
        }
    }, []);

    const setOutputVolume = useCallback((volume: number) => {
        if (audioElRef.current) {
            audioElRef.current.volume = Math.min(1, Math.max(0, volume));
        }
    }, []);

    return { startSession, disconnect, dataChannel, setOutputMuted, setOutputVolume };
}
