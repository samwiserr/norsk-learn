import { createLogger } from "@/lib/logger";

describe("createLogger", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.spyOn(console, "debug").mockImplementation(() => {});
    jest.spyOn(console, "info").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv, writable: true });
  });

  it("creates a tagged logger", () => {
    process.env.LOG_LEVEL = "debug";
    const log = createLogger("TestTag");
    log.info("hello");
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("[TestTag]"),
      "hello"
    );
  });

  it("redacts objects with secret-like keys", () => {
    process.env.LOG_LEVEL = "debug";
    const log = createLogger("Secrets");
    log.info({ api_key: "super-secret-12345", name: "visible" });
    const call = (console.info as jest.Mock).mock.calls[0];
    expect(call[1]).toEqual({ api_key: "[REDACTED]", name: "visible" });
  });

  it("suppresses debug/info in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.LOG_LEVEL;
    const log = createLogger("Prod");
    log.debug("should be hidden");
    log.info("also hidden");
    log.warn("this shows");
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });
});
