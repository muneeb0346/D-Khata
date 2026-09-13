type LogLevel = "info" | "warn" | "error";

const prefix = "[D-Khata]";

function formatMessage(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>,
): string {
  const timestamp = new Date().toISOString();
  const payload = data ? ` ${JSON.stringify(data)}` : "";
  return `${prefix} [${timestamp}] [${level.toUpperCase()}] ${message}${payload}`;
}

export const logger = {
  info(message: string, data?: Record<string, unknown>): void {
    console.log(formatMessage("info", message, data));
  },
  warn(message: string, data?: Record<string, unknown>): void {
    console.warn(formatMessage("warn", message, data));
  },
  error(message: string, data?: Record<string, unknown>): void {
    console.error(formatMessage("error", message, data));
  },
};
