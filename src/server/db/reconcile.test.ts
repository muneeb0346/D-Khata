import { describe, it, expect } from "vitest";
import { reconcileLedger } from "./reconcile";
import type { Customer, Transaction } from "@/types";

function makeCustomer(totalBalance: number): Customer {
  return {
    id: "c1",
    name: "Ali",
    phone: "03001234567",
    totalBalance: totalBalance,
  };
}

function makeTxn(overrides: Partial<Transaction>): Transaction {
  return {
    customerId: "c1",
    date: new Date("2026-01-01T00:00:00.000Z"),
    description: "",
    originalAmount: 0,
    remainingBalance: 0,
    settlement: "",
    ...overrides,
  } as Transaction;
}

describe("reconcileLedger", () => {
  it("advance carry-over: VERIFIED payment larger than outstanding credits creates carried advance that offsets next CREDIT", () => {
    const customer = makeCustomer(0);
    const txns: Transaction[] = [
      makeTxn({
        id: "t1",
        type: "CREDIT",
        approval: "VERIFIED",
        originalAmount: 100,
        remainingBalance: 100,
        settlement: "UNPAID",
        date: new Date("2026-01-01T00:00:00.000Z"),
      }),
      makeTxn({
        id: "p1",
        type: "PAYMENT",
        approval: "VERIFIED",
        originalAmount: 150,
        remainingBalance: 0,
        settlement: "SETTLED",
        date: new Date("2026-01-02T00:00:00.000Z"),
      }),
      makeTxn({
        id: "t2",
        type: "CREDIT",
        approval: "VERIFIED",
        originalAmount: 100,
        remainingBalance: 100,
        settlement: "UNPAID",
        date: new Date("2026-01-03T00:00:00.000Z"),
      }),
    ];

    const result = reconcileLedger(customer, txns);

    const t1 = result.transactions.find((t) => t.id === "t1");
    const t2 = result.transactions.find((t) => t.id === "t2");

    expect(t1?.remainingBalance).toBe(0);
    expect(t1?.settlement).toBe("SETTLED");
    expect(t2?.remainingBalance).toBe(50);
    expect(t2?.settlement).toBe("PARTIAL");
  });

  it("disputed transactions excluded from creditsTotal and do not affect balance", () => {
    const customer = makeCustomer(0);
    const txns: Transaction[] = [
      makeTxn({
        id: "t1",
        type: "CREDIT",
        approval: "DISPUTED",
        originalAmount: 100,
        remainingBalance: 100,
        settlement: "SETTLED",
        date: new Date("2026-01-01T00:00:00.000Z"),
      }),
      makeTxn({
        id: "t2",
        type: "CREDIT",
        approval: "VERIFIED",
        originalAmount: 50,
        remainingBalance: 50,
        settlement: "UNPAID",
        date: new Date("2026-01-02T00:00:00.000Z"),
      }),
      makeTxn({
        id: "p1",
        type: "PAYMENT",
        approval: "VERIFIED",
        originalAmount: 30,
        remainingBalance: 0,
        settlement: "SETTLED",
        date: new Date("2026-01-03T00:00:00.000Z"),
      }),
    ];

    const result = reconcileLedger(customer, txns);

    expect(result.customer.totalBalance).toBe(20);
    const t1 = result.transactions.find((t) => t.id === "t1");
    const t2 = result.transactions.find((t) => t.id === "t2");
    expect(t1?.remainingBalance).toBe(100);
    expect(t2?.remainingBalance).toBe(20);
  });

  it("multiple credits consumed out-of-order by a single large payment (FIFO)", () => {
    const customer = makeCustomer(0);
    const txns: Transaction[] = [
      makeTxn({
        id: "t1",
        type: "CREDIT",
        approval: "VERIFIED",
        originalAmount: 100,
        remainingBalance: 100,
        settlement: "UNPAID",
        date: new Date("2026-01-02T00:00:00.000Z"),
      }),
      makeTxn({
        id: "t2",
        type: "CREDIT",
        approval: "VERIFIED",
        originalAmount: 50,
        remainingBalance: 50,
        settlement: "UNPAID",
        date: new Date("2026-01-01T00:00:00.000Z"),
      }),
      makeTxn({
        id: "p1",
        type: "PAYMENT",
        approval: "VERIFIED",
        originalAmount: 120,
        remainingBalance: 0,
        settlement: "SETTLED",
        date: new Date("2026-01-03T00:00:00.000Z"),
      }),
    ];

    const result = reconcileLedger(customer, txns);

    const t2 = result.transactions.find((t) => t.id === "t2");
    const t1 = result.transactions.find((t) => t.id === "t1");

    expect(t2?.remainingBalance).toBe(0);
    expect(t2?.settlement).toBe("SETTLED");
    expect(t1?.remainingBalance).toBe(30);
    expect(t1?.settlement).toBe("PARTIAL");
  });

  it("remainingBalance never goes negative", () => {
    const customer = makeCustomer(0);
    const txns: Transaction[] = [
      makeTxn({
        id: "t1",
        type: "CREDIT",
        approval: "VERIFIED",
        originalAmount: 50,
        remainingBalance: 50,
        settlement: "UNPAID",
        date: new Date("2026-01-01T00:00:00.000Z"),
      }),
      makeTxn({
        id: "p1",
        type: "PAYMENT",
        approval: "VERIFIED",
        originalAmount: 50,
        remainingBalance: 0,
        settlement: "SETTLED",
        date: new Date("2026-01-02T00:00:00.000Z"),
      }),
    ];

    const result = reconcileLedger(customer, txns);
    const t1 = result.transactions.find((t) => t.id === "t1");

    expect(t1?.remainingBalance).toBe(0);
    expect(t1?.settlement).toBe("SETTLED");

    for (const txn of result.transactions) {
      if (txn.type === "CREDIT") {
        expect(txn.remainingBalance).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("settlement is one of UNPAID/PARTIAL/SETTLED", () => {
    const customer = makeCustomer(0);
    const txns: Transaction[] = [
      makeTxn({
        id: "t1",
        type: "CREDIT",
        approval: "VERIFIED",
        originalAmount: 100,
        remainingBalance: 100,
        settlement: "UNPAID",
        date: new Date("2026-01-01T00:00:00.000Z"),
      }),
      makeTxn({
        id: "p1",
        type: "PAYMENT",
        approval: "VERIFIED",
        originalAmount: 50,
        remainingBalance: 0,
        settlement: "SETTLED",
        date: new Date("2026-01-02T00:00:00.000Z"),
      }),
    ];

    const result = reconcileLedger(customer, txns);
    const validSettlements = ["UNPAID", "PARTIAL", "SETTLED"];

    for (const txn of result.transactions) {
      expect(validSettlements).toContain(txn.settlement);
    }
  });

  it("empty transactions returns customer with totalBalance unchanged and empty transactions", () => {
    const customer = makeCustomer(0);
    const result = reconcileLedger(customer, []);

    expect(result.transactions).toEqual([]);
    expect(result.customer.totalBalance).toBe(0);
  });

  it("returned transactions array is in date-ascending order (input was unsorted)", () => {
    const customer = makeCustomer(0);
    const txns: Transaction[] = [
      makeTxn({
        id: "t3",
        type: "CREDIT",
        approval: "VERIFIED",
        originalAmount: 30,
        remainingBalance: 30,
        settlement: "UNPAID",
        date: new Date("2026-03-01T00:00:00.000Z"),
      }),
      makeTxn({
        id: "t1",
        type: "CREDIT",
        approval: "VERIFIED",
        originalAmount: 10,
        remainingBalance: 10,
        settlement: "UNPAID",
        date: new Date("2026-01-01T00:00:00.000Z"),
      }),
      makeTxn({
        id: "t2",
        type: "CREDIT",
        approval: "VERIFIED",
        originalAmount: 20,
        remainingBalance: 20,
        settlement: "UNPAID",
        date: new Date("2026-02-01T00:00:00.000Z"),
      }),
    ];

    const result = reconcileLedger(customer, txns);

    expect(result.transactions.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
  });

  it("credit fully covered by prior advance has remainingBalance === 0 and settlement === SETTLED", () => {
    const customer = makeCustomer(0);
    const txns: Transaction[] = [
      makeTxn({
        id: "p1",
        type: "PAYMENT",
        approval: "VERIFIED",
        originalAmount: 200,
        remainingBalance: 0,
        settlement: "SETTLED",
        date: new Date("2026-01-01T00:00:00.000Z"),
      }),
      makeTxn({
        id: "t1",
        type: "CREDIT",
        approval: "VERIFIED",
        originalAmount: 100,
        remainingBalance: 100,
        settlement: "UNPAID",
        date: new Date("2026-01-02T00:00:00.000Z"),
      }),
    ];

    const result = reconcileLedger(customer, txns);
    const t1 = result.transactions.find((t) => t.id === "t1");

    expect(t1?.remainingBalance).toBe(0);
    expect(t1?.settlement).toBe("SETTLED");
  });
});
