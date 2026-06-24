const LOG_LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL];
}

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const output = JSON.stringify(entry);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("debug")) formatLog("debug", message, meta);
  },
  info(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("info")) formatLog("info", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("warn")) formatLog("warn", message, meta);
  },
  error(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("error")) formatLog("error", message, meta);
  },
};

export function requestLogger(method: string, path: string, status: number, durationMs: number, meta?: Record<string, unknown>) {
  const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
  if (!shouldLog(level)) return;
  formatLog(level, `${method} ${path} ${status}`, { method, path, status, duration_ms: durationMs, ...meta });
}

export function authLogger(event: string, address?: string, meta?: Record<string, unknown>) {
  if (!shouldLog("info")) return;
  formatLog("info", `auth:${event}`, { event, address, ...meta });
}

export function escrowLogger(event: string, escrowId: string, actor?: string, meta?: Record<string, unknown>) {
  if (!shouldLog("info")) return;
  formatLog("info", `escrow:${event}`, { event, escrow_id: escrowId, actor, ...meta });
}
