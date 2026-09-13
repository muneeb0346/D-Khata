import { describe, it, expect, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  it("info calls console.log with formatted message", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test message");
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[D-Khata]"));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[INFO]"));
    spy.mockRestore();
  });

  it("info includes data payload when provided", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test message", { key: "value" });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"key":"value"'));
    spy.mockRestore();
  });

  it("warn calls console.warn with formatted message", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("warning message");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[D-Khata]"));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[WARN]"));
    spy.mockRestore();
  });

  it("error calls console.error with formatted message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("error message");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[D-Khata]"));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[ERROR]"));
    spy.mockRestore();
  });

  it("error includes error data when provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("failed", { code: 500 });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"code":500'));
    spy.mockRestore();
  });
});
