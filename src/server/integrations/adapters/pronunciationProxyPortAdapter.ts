import "server-only";

import { proxyPronunciationAssess } from "@/lib/integrations/pronunciation/pronunciationProxyAdapter";
import type { PronunciationPort } from "@/src/server/integrations/ports/pronunciationPort";

export const pronunciationProxyPortAdapter: PronunciationPort = {
  proxyAssess: (formData) => proxyPronunciationAssess(formData),
};
