import "server-only";

export type RealtimeSessionInput = {
  model?: string;
  modalities?: string[];
};

export interface RealtimePort {
  createSession(input: RealtimeSessionInput): Promise<{
    id?: string;
    client_secret?: { value?: string } | string;
    expires_at?: number;
    model?: string;
  } | null>;
}
