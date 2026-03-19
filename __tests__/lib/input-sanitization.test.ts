import {
  sanitizeString,
  sanitizeMessage,
  isValidEmail,
  isValidPassword,
  sanitizeCEFRLevel,
  sanitizeLanguageCode,
} from "@/lib/input-sanitization";

describe("sanitizeString", () => {
  it("trims and limits length", () => {
    const long = "a".repeat(2000);
    expect(sanitizeString(long, 100).length).toBe(100);
  });

  it("returns empty for non-string input", () => {
    expect(sanitizeString(null as any)).toBe("");
    expect(sanitizeString(123 as any)).toBe("");
  });
});

describe("sanitizeMessage", () => {
  it("strips HTML tags", () => {
    const result = sanitizeMessage("<script>alert('xss')</script>hello");
    expect(result).not.toContain("<script>");
    expect(result).toContain("hello");
  });
});

describe("isValidEmail", () => {
  it("validates correct emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });
  it("rejects invalid emails", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });
});

describe("isValidPassword", () => {
  it("requires minimum length", () => {
    expect(isValidPassword("short")).toBe(false);
    expect(isValidPassword("longenoughpassword")).toBe(true);
  });
});

describe("sanitizeCEFRLevel", () => {
  it("accepts valid levels", () => {
    expect(sanitizeCEFRLevel("A1")).toBe("A1");
    expect(sanitizeCEFRLevel("B2")).toBe("B2");
  });
  it("rejects invalid levels", () => {
    expect(sanitizeCEFRLevel("X9")).toBeNull();
  });
});

describe("sanitizeLanguageCode", () => {
  it("accepts valid codes", () => {
    expect(sanitizeLanguageCode("en")).toBe("en");
    expect(sanitizeLanguageCode("no")).toBe("no");
  });
  it("rejects invalid codes", () => {
    expect(sanitizeLanguageCode("xx")).toBeNull();
  });
});
