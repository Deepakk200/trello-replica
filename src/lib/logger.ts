// Structured server-side logging. Dev: pretty console. Prod: JSON (log drains).
type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = { level, message, timestamp: new Date().toISOString(), context };
  if (process.env.NODE_ENV === "production") {
    process.stdout.write(JSON.stringify(entry) + "\n");
  } else {
    const prefix = { info: "ℹ", warn: "⚠", error: "✖" }[level];
    // eslint-disable-next-line no-console
    console[level === "info" ? "log" : level](`${prefix} [${entry.timestamp}] ${message}`, context ?? "");
  }
}

export const logger = {
  info: (msg: string, ctx?: Record<string, unknown>) => log("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log("error", msg, ctx),
};
