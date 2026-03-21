import "server-only";

export interface PronunciationPort {
  proxyAssess(formData: FormData): Promise<{
    status: number;
    text: string;
    contentType?: string | null;
  }>;
}
