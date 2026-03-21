import "server-only";

export interface SpeechTokenPort {
  mintToken(): Promise<{ token: string; region: string; expires_in?: number }>;
}
