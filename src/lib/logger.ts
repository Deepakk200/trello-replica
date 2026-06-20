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
    console[level === "info" ? "log" : level](`${prefix} [${entry.timestamp}] ${message}`, context ?? "");
  }
}

export const logger = {
  info: (msg: string, ctx?: Record<string, unknown>) => log("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log("error", msg, ctx),
};

/**
 * Log an exception AND forward it to Sentry with structured context (userId,
 * boardId, action, …). Use in server-action catch blocks. Sentry is a no-op
 * when no DSN is configured, so this is safe everywhere.
 */
export async function captureError(error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(message, context);
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // Sentry optional — never let reporting throw.
  }
}
