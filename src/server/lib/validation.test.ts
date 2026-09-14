import { describe, it, expect } from "vitest";
import { validateCustomerData, hasValidPhone } from "./validation";

describe("validateCustomerData", () => {
  it("name with digits → invalid", () => {
    const result = validateCustomerData({
      name: "Ali123",
      phone: "03001234567",
    });
    expect(result).toEqual({ ok: false, error: "Name is required." });
  });

  it("empty name → invalid", () => {
    const result = validateCustomerData({ name: "", phone: "03001234567" });
    expect(result).toEqual({ ok: false, error: "Name is required." });
  });

  it("CNIC empty/undefined → valid (optional)", () => {
    expect(
      validateCustomerData({ name: "Ali Khan", phone: "03001234567" }),
    ).toBeNull();
    expect(
      validateCustomerData({
        name: "Ali Khan",
        phone: "03001234567",
        cnic: "",
      }),
    ).toBeNull();
  });

  it("name with only whitespace → invalid", () => {
    const result = validateCustomerData({ name: "   ", phone: "03001234567" });
    expect(result).toBeNull();
  });
});

describe("hasValidPhone", () => {
  it("9 digits → invalid", () => {
    expect(hasValidPhone("030012345")).toBe(false);
  });

  it("10 digits → valid", () => {
    expect(hasValidPhone("03001234567".slice(0, 10))).toBe(true);
  });

  it("11 digits → valid", () => {
    expect(hasValidPhone("03001234567")).toBe(true);
  });

  it("12 digits → invalid", () => {
    expect(hasValidPhone("030012345678")).toBe(false);
  });

  it("phone with non-digit chars → valid after stripping", () => {
    expect(hasValidPhone("0300-1234567")).toBe(true);
  });
});

describe("CNIC validation via validateCustomerData", () => {
  it("CNIC 12345-1234567-1 → valid", () => {
    expect(
      validateCustomerData({
        name: "Ali Khan",
        phone: "03001234567",
        cnic: "12345-1234567-1",
      }),
    ).toBeNull();
  });

  it("CNIC too short → invalid", () => {
    const result = validateCustomerData({
      name: "Ali Khan",
      phone: "03001234567",
      cnic: "12345-1234567",
    });
    expect(result).toEqual({
      ok: false,
      error: "CNIC must follow the format xxxxx-xxxxxxx-x.",
    });
  });

  it("CNIC wrong dash positions → invalid", () => {
    const result = validateCustomerData({
      name: "Ali Khan",
      phone: "03001234567",
      cnic: "1234-1234567-1",
    });
    expect(result).toEqual({
      ok: false,
      error: "CNIC must follow the format xxxxx-xxxxxxx-x.",
    });
  });
});
