type LogLevel = "info" | "warn" | "error";

function serializeData(data?: Record<string, unknown>): unknown {
  if (!data) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v instanceof Error ? { message: v.message, stack: v.stack, name: v.name } : v;
  }
  return out;
}

function writeLog(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  const entry = JSON.stringify({
    level,
    message,
    ...(data ? { data: serializeData(data) } : {}),
    timestamp: new Date().toISOString(),
  });
  if (level === "error") console.error(entry);
  else console.log(entry);
}

export const logger = {
  info(message: string, data?: Record<string, unknown>): void {
    writeLog("info", message, data);
  },
  warn(message: string, data?: Record<string, unknown>): void {
    writeLog("warn", message, data);
  },
  error(message: string, data?: Record<string, unknown>): void {
    writeLog("error", message, data);
  },
};
