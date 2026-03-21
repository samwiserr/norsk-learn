import "server-only";

import { createLogger } from "@/lib/logger";
import { config } from "@/lib/config";

const log = createLogger("PronunciationProxyAdapter");

export type ProxyPronunciationResult = {
  status: number;
  text: string;
  contentType: string | null;
};

/**
 * Provider-specific: forwards pronunciation assessment request to external service.
 */
export async function proxyPronunciationAssess(formData: FormData): Promise<ProxyPronunciationResult> {
  const targetUrl = config.pronunciation.serviceUrl;
  if (!targetUrl) {
    throw new Error("PRONUNCIATION_SERVICE_URL is not configured");
  }

  const res = await fetch(`${targetUrl}/assess`, {
    method: "POST",
    body: formData,
  });

  const text = await res.text();
  const contentType = res.headers.get("content-type");

  if (!res.ok) {
    throw new Error(`Pronunciation service error ${res.status}: ${text.slice(0, 500)}`);
  }

  log.debug("Pronunciation proxy ok", { status: res.status, contentType });
  return { status: res.status, text, contentType };
}

