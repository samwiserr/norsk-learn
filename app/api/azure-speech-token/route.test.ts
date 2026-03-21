function mockNextResponseJson(data: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  const h = new Map<string, string>(Object.entries(init.headers ?? {}));
  return {
    status: init.status ?? 200,
    headers: {
      get: (k: string) => h.get(k.toLowerCase()) ?? h.get(k) ?? null,
      set: (k: string, v: string) => {
        h.set(k, v);
      },
    },
    json: async () => data,
  };
}

jest.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number; headers?: Record<string, string> }) =>
      mockNextResponseJson(data, init ?? {}),
  },
}));

jest.mock("@/lib/config", () => ({
  config: {
    azureSpeech: {
      key: "azure-key",
      region: "norwayeast",
      tokenUrl: undefined,
    },
  },
}));

jest.mock("@/lib/rate-limiting", () => ({
  rateLimit: jest.fn(),
}));

const { GET } = require("./route");
const { rateLimit } = require("@/lib/rate-limiting");
const { config } = require("@/lib/config");

const buildRequest = (headers: Record<string, string> = {}) => {
  const headerStore = new Map<string, string>(Object.entries(headers));
  return {
    headers: {
      get: (key: string) => headerStore.get(key.toLowerCase()) ?? headerStore.get(key) ?? null,
    },
  } as any;
};

describe("GET /api/azure-speech-token", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.azureSpeech.key = "azure-key";
    config.azureSpeech.region = "norwayeast";
  });

  it("returns token when Azure responds OK", async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: true, remaining: 5 });
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "token123",
    });

    const req = buildRequest();
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe("token123");
    expect(body.region).toBe("norwayeast");
  });

  it("returns 429 when rate limited", async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false, retryAfter: 7 });

    const req = buildRequest();
    const res = await GET(req as any);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/Too many requests/i);
  });

  it("returns 500 when key/region missing", async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: true, remaining: 5 });
    config.azureSpeech.key = "";

    const req = buildRequest();
    const res = await GET(req as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/not configured/i);
  });
});


