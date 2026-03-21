/**
 * @jest-environment node
 */
function mockNextResponseJson(data: unknown, init: { status?: number } = {}) {
  return {
    status: init.status ?? 200,
    headers: {
      get: () => null,
      set: jest.fn(),
    },
    json: async () => data,
  };
}

jest.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => mockNextResponseJson(data, init ?? {}),
  },
}));

jest.mock("@/lib/rate-limiting", () => ({
  rateLimit: jest.fn().mockResolvedValue({ success: true, remaining: 9 }),
}));

jest.mock("@/src/server/persistence/sessionSnapshotStore", () => ({
  saveSessionSnapshot: jest.fn().mockResolvedValue({ ok: true }),
  saveUserSessionSnapshot: jest.fn().mockResolvedValue({ ok: true }),
}));

const { POST } = require("./route");
const { saveSessionSnapshot } = require("@/src/server/persistence/sessionSnapshotStore");

describe("POST /api/sessions/sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when x-device-id missing", async () => {
    const req = {
      json: async () => ({
        snapshot: { version: 1, sessions: [] },
      }),
      headers: {
        get: (k: string) => (k.toLowerCase() === "x-request-id" ? "rid" : null),
      },
    };
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(saveSessionSnapshot).not.toHaveBeenCalled();
  });

  it("persists when device id present", async () => {
    const req = {
      json: async () => ({
        snapshot: { version: 1, sessions: [{ id: "a" }] },
      }),
      headers: {
        get: (k: string) => {
          const key = k.toLowerCase();
          if (key === "x-request-id") return "rid";
          if (key === "x-device-id") return "device-device-1";
          return null;
        },
      },
    };
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(saveSessionSnapshot).toHaveBeenCalled();
  });
});
