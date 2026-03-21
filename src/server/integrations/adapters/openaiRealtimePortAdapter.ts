import "server-only";

import { createOpenaiRealtimeSession } from "@/lib/integrations/openaiRealtime/openaiRealtimeAdapter";
import type { RealtimePort, RealtimeSessionInput } from "@/src/server/integrations/ports/realtimePort";

export const openaiRealtimePortAdapter: RealtimePort = {
  createSession(input: RealtimeSessionInput) {
    return createOpenaiRealtimeSession({
      model: input.model,
      modalities: input.modalities,
    });
  },
};
