import "server-only";

import { config } from "@/lib/config";

const OPENAI_REALTIME_URL = "https://api.openai.com/v1/realtime/sessions";
const OPENAI_BETA_HEADER = "realtime=v1";

export type CreateOpenaiRealtimeSessionArgs = {
  model?: string;
  modalities?: string[];
};

/**
 * Provider-specific: creates an OpenAI Realtime session and returns the upstream JSON payload.
 */
export async function createOpenaiRealtimeSession(args: CreateOpenaiRealtimeSessionArgs = {}) {
  const apiKey = config.openai.apiKey;
  if (!apiKey) {
    throw new Error("OpenAI Realtime API key is not configured.");
  }

  const model = args.model || config.openai.realtimeModel;
  const modalities = args.modalities || ["text", "audio"];

  const response = await fetch(OPENAI_REALTIME_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": OPENAI_BETA_HEADER,
    },
    body: JSON.stringify({ model, modalities }),
  });

  if (!response.ok) {
    const text = await response.text();
    // Keep error text for route-layer details.
    const err = new Error(`Failed to create OpenAI Realtime session: ${text.slice(0, 500)}`);
    (err as any).status = response.status;
    (err as any).statusText = response.statusText;
    throw err;
  }

  return response.json();
}

