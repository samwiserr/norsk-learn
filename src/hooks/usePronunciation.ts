import { useCallback, useRef } from "react";
import { addBreadcrumb, captureException } from "@sentry/nextjs";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

export interface WordPhonemeResult {
    word: string;
    accuracyScore: number;
    phonemes: { phoneme: string; accuracyScore: number }[];
}

interface PronunciationConfig {
    onScore: (accuracy: number, fluency: number, completeness: number) => void;
    onPhonemes?: (words: WordPhonemeResult[]) => void;
}

interface AssessmentOptions {
    referenceText?: string;
    language?: string;
    mode?: "drill" | "conversation";
}

export function usePronunciation(config: PronunciationConfig) {
    const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);

    const stopAssessment = useCallback(() => {
        const recognizer = recognizerRef.current;
        if (recognizer) {
            addBreadcrumb({
                category: "pronunciation",
                message: "Stop assessment",
                level: "info",
            });
            recognizer.stopContinuousRecognitionAsync(
                () => {},
                () => {}
            );
            recognizer.close();
            recognizerRef.current = null;
        }
    }, []);

    const startAssessment = useCallback(async (options: AssessmentOptions = {}) => {
        stopAssessment();
        const { referenceText = "", language = "nb-NO", mode = "drill" } = options;

        try {
            addBreadcrumb({
                category: "pronunciation",
                message: "Start assessment",
                level: "info",
                data: { mode, language, hasReference: Boolean(referenceText) },
            });

            const tokenRes = await fetch("/api/azure-speech-token");
            if (!tokenRes.ok) {
                const detail = await tokenRes.json().catch(() => ({}));
                throw new Error(detail.error || "Failed to fetch Azure Speech token");
            }
            const token = await tokenRes.json() as { token: string; region: string };

            const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token.token, token.region);
            speechConfig.speechRecognitionLanguage = language;

            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
            recognizerRef.current = recognizer;

            const refText = mode === "drill" ? referenceText : referenceText || " ";
            const paConfig = new SpeechSDK.PronunciationAssessmentConfig(
                refText,
                SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
                SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
                true
            );
            paConfig.enableProsodyAssessment = true;
            paConfig.applyTo(recognizer);

            recognizer.recognized = (_s, event) => {
                const result = event.result;
                if (result && result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    const paResult = SpeechSDK.PronunciationAssessmentResult.fromResult(result);
                    config.onScore(
                        Math.round(paResult.accuracyScore ?? 0),
                        Math.round(paResult.fluencyScore ?? 0),
                        Math.round(paResult.completenessScore ?? 0),
                    );

                    if (config.onPhonemes) {
                        try {
                            const detailJson = result.properties?.getProperty(
                                SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult
                            );
                            if (detailJson) {
                                const detail = JSON.parse(detailJson);
                                const nBest = detail?.NBest?.[0];
                                if (nBest?.Words) {
                                    const words: WordPhonemeResult[] = nBest.Words.map((w: any) => ({
                                        word: w.Word ?? "",
                                        accuracyScore: w.PronunciationAssessment?.AccuracyScore ?? 0,
                                        phonemes: (w.Phonemes ?? []).map((p: any) => ({
                                            phoneme: p.Phoneme ?? "",
                                            accuracyScore: p.PronunciationAssessment?.AccuracyScore ?? 0,
                                        })),
                                    }));
                                    config.onPhonemes(words);
                                }
                            }
                        } catch {
                            // phoneme extraction is best-effort
                        }
                    }
                }
            };

            recognizer.canceled = (_s, event) => {
                addBreadcrumb({
                    category: "pronunciation",
                    message: "Recognizer canceled",
                    level: "warning",
                    data: { reason: event?.reason, error: event?.errorDetails },
                });
                recognizerRef.current = null;
            };

            recognizer.sessionStopped = () => {
                addBreadcrumb({
                    category: "pronunciation",
                    message: "Recognizer session stopped",
                    level: "info",
                });
                recognizerRef.current = null;
            };

            await new Promise<void>((resolve, reject) => {
                recognizer.startContinuousRecognitionAsync(resolve, reject);
            });
        } catch (error) {
            captureException(error);
            throw error;
        }
    }, [config, stopAssessment]);

    return { startAssessment, stopAssessment };
}
