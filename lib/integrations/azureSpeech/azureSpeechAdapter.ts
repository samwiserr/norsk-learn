import "server-only";

import { config } from "@/lib/config";

const DEFAULT_TTL_SECONDS = 600;

export type MintAzureSpeechTokenResult = {
  token: string;
  region: string;
  expires_in: number;
};

/**
 * Provider-specific: mints an Azure Speech authorization token (server side).
 */
export async function mintAzureSpeechToken(): Promise<MintAzureSpeechTokenResult> {
  const { key, region, tokenUrl } = config.azureSpeech;

  if (!key || !region) {
    throw new Error("Azure Speech key/region not configured.");
  }

  const url =
    tokenUrl || `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to mint Azure Speech token: ${text.slice(0, 500)}`);
  }

  const token = await resp.text();
  return {
    token,
    region,
    expires_in: DEFAULT_TTL_SECONDS,
  };
}

