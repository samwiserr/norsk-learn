/**
 * @jest-environment node
 */
jest.mock("@/sentry.server.config", () => ({
  setLanguageContext: jest.fn(),
}));

import { z } from "zod";
import { getClientIpKey, parseBodyWithSchema } from "@/lib/api/publicRoute";

function req(headers: Record<string, string>): Request {
  const m = new Map(Object.entries(headers));
  return {
    headers: {
      get: (k: string) => m.get(k.toLowerCase()) ?? m.get(k) ?? null,
    },
  } as Request;
}

describe("publicRoute", () => {
  describe("getClientIpKey", () => {
    it("uses first x-forwarded-for address", () => {
      expect(getClientIpKey(req({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" }))).toBe("203.0.113.1");
    });

    it("falls back to x-real-ip", () => {
      expect(getClientIpKey(req({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    });

    it("uses anonymous when missing", () => {
      expect(getClientIpKey(req({}))).toBe("anonymous");
    });
  });

  describe("parseBodyWithSchema", () => {
    const schema = z.object({ rate: z.number().positive() });

    it("returns data on success", () => {
      const r = parseBodyWithSchema("rid", { rate: 12 }, schema);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.data.rate).toBe(12);
    });

    it("returns response on validation failure", () => {
      const r = parseBodyWithSchema("rid", { rate: -1 }, schema);
      expect(r.ok).toBe(false);
    });
  });
});
