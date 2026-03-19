jest.mock("next/server", () => ({
  NextResponse: {
    json: (data: any, init: any = {}) => ({
      status: init.status ?? 200,
      headers: init.headers ?? {},
      json: async () => data,
    }),
  },
}));

const { POST } = require("./route");

jest.mock("@/lib/config", () => ({
  config: {
    openai: {
      apiKey: "test-openai-key",
      realtimeModel: "gpt-4o-realtime-preview-2024-12-17",
    },
  },
}));

jest.mock("@/lib/rate-limiting", () => ({
  rateLimit: jest.fn(),
}));

const { rateLimit } = require("@/lib/rate-limiting");
const { config } = require("@/lib/config");

const buildRequest = (body: any = {}, headers: Record<string, string> = {}) => {
  const headerStore = new Map<string, string>(Object.entries(headers));
  return {
    json: async () => body,
    headers: {
      get: (key: string) => headerStore.get(key.toLowerCase()) ?? headerStore.get(key) ?? null,
    },
  } as any;
};

describe("POST /api/openai-realtime", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.openai.apiKey = "test-openai-key";
  });

  it("returns 200 with client_secret when upstream succeeds", async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: true, remaining: 3 });

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "sess_123",
        client_secret: { value: "cs_test", expires_at: 123 },
        expires_at: 123,
      }),
    });

    const req = buildRequest({});

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.client_secret).toBeDefined();
    expect(body.session_id).toBe("sess_123");
  });

  it("returns 429 when rate limited", async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false, retryAfter: 5 });

    const req = buildRequest({});

    const res = await POST(req as any);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/Too many requests/i);
  });

  it("returns 500 when OpenAI key is missing", async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: true, remaining: 3 });
    config.openai.apiKey = "";

    const req = buildRequest({});

    const res = await POST(req as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/key is not configured/i);
  });
});

