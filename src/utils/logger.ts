type LogLevel = "info" | "warn" | "error";

function writeLog(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>,
): void {
  const entry = JSON.stringify({
    level,
    message,
    ...(data ? { data } : {}),
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
