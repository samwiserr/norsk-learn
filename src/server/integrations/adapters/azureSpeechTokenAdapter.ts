import "server-only";

import { mintAzureSpeechToken } from "@/lib/integrations/azureSpeech/azureSpeechAdapter";
import type { SpeechTokenPort } from "@/src/server/integrations/ports/speechTokenPort";

export const azureSpeechTokenAdapter: SpeechTokenPort = {
  mintToken: () => mintAzureSpeechToken(),
};
