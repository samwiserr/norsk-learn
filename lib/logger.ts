type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /authorization/i,
  /credential/i,
];

function redactSecrets(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (typeof arg === "string") {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(arg)) {
          return arg.replace(
            /[:=]\s*['"]?[\w\-./+]{10,}['"]?/g,
            ": [REDACTED]"
          );
        }
      }
    }
    if (arg && typeof arg === "object") {
      try {
        const obj = arg as Record<string, unknown>;
        const redacted: Record<string, unknown> = {};
        for (const key of Object.keys(obj)) {
          if (SECRET_PATTERNS.some((p) => p.test(key))) {
            redacted[key] = "[REDACTED]";
          } else {
            redacted[key] = obj[key];
          }
        }
        return redacted;
      } catch {
        return arg;
      }
    }
    return arg;
  });
}

function getMinLevel(): LogLevel {
  if (typeof process !== "undefined") {
    if (process.env.NODE_ENV === "production") return "warn";
    if (process.env.NODE_ENV === "test") return "error";
  }
  return "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getMinLevel()];
}

function formatPrefix(level: LogLevel, tag?: string): string {
  const ts = new Date().toISOString();
  const tagStr = tag ? ` [${tag}]` : "";
  return `${ts} ${level.toUpperCase()}${tagStr}`;
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createLogger(tag?: string): Logger {
  const log = (level: LogLevel, args: unknown[]) => {
    if (!shouldLog(level)) return;
    const safe = redactSecrets(args);
    const prefix = formatPrefix(level, tag);
    switch (level) {
      case "debug":
        console.debug(prefix, ...safe);
        break;
      case "info":
        console.info(prefix, ...safe);
        break;
      case "warn":
        console.warn(prefix, ...safe);
        break;
      case "error":
        console.error(prefix, ...safe);
        break;
    }
  };

  return {
    debug: (...args: unknown[]) => log("debug", args),
    info: (...args: unknown[]) => log("info", args),
    warn: (...args: unknown[]) => log("warn", args),
    error: (...args: unknown[]) => log("error", args),
  };
}

export const logger = createLogger();
