import { describe, it, expect, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  it("info calls console.log with JSON entry", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test message");
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/\{"level":"info"/));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"message":"test message"'));
    spy.mockRestore();
  });

  it("info includes data payload when provided", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test message", { key: "value" });
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/\{"level":"info"/));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"data":{"key":"value"}'));
    spy.mockRestore();
  });

  it("warn calls console.log with JSON entry", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.warn("warning message");
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/\{"level":"warn"/));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"message":"warning message"'));
    spy.mockRestore();
  });

  it("error calls console.error with JSON entry", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("error message");
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/\{"level":"error"/));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"message":"error message"'));
    spy.mockRestore();
  });

  it("error includes error data when provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("failed", { code: 500 });
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/\{"level":"error"/));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"data":{"code":500}'));
    spy.mockRestore();
  });
});
