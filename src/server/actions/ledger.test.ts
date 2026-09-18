import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getLedger,
  processPayment,
  deleteCustomer,
} from "@/server/actions";
import { db } from "@/server/db";

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
  ne: vi.fn(),
}));

vi.mock("@/server/db", () => {
  const returningMock = vi.fn();
  const whereMock = vi.fn().mockImplementation(() => {
    return {
      returning: returningMock,
      then: function (resolve: (val: unknown[]) => void) {
        resolve([]);
      },
    };
  });
  const whereDeleteMock = vi.fn().mockResolvedValue([]);

  const setMock = vi.fn().mockReturnValue({
    where: whereMock,
  });

  const valuesMock = vi.fn().mockReturnValue({
    returning: returningMock,
  });

  const orderByMock = vi.fn();
  const whereSelectMock = vi.fn().mockReturnValue({
    orderBy: orderByMock,
  });
  const fromMock = vi.fn().mockReturnValue({
    where: whereSelectMock,
  });

  const deleteMock = vi.fn().mockReturnValue({
    where: whereDeleteMock,
  });

  const queryMock = {
    customers: { findFirst: vi.fn() },
    transactions: { findFirst: vi.fn() },
  };

  const txMock = {
    query: queryMock,
    insert: vi.fn().mockReturnValue({ values: valuesMock }),
    update: vi.fn().mockReturnValue({ set: setMock }),
    select: vi.fn().mockReturnValue({ from: fromMock }),
    delete: deleteMock,
  };

  return {
    db: {
      query: queryMock,
      insert: vi.fn().mockReturnValue({ values: valuesMock }),
      update: vi.fn().mockReturnValue({ set: setMock }),
      select: vi.fn().mockReturnValue({ from: fromMock }),
      delete: deleteMock,
      transaction: vi.fn(async (cb) => cb(txMock)),
      _mocks: {
        queryMock,
        returningMock,
        whereMock,
        whereDeleteMock,
        setMock,
        valuesMock,
        orderByMock,
        whereSelectMock,
        fromMock,
        deleteMock,
        txMock,
      },
    },
  };
});

interface QueryMocks {
  customers: { findFirst: Mock };
  transactions: { findFirst: Mock };
}

interface TxMocks {
  query: QueryMocks;
  insert: Mock;
  update: Mock;
  select: Mock;
  delete: Mock;
}

interface DBMocks {
  queryMock: QueryMocks;
  returningMock: Mock;
  whereMock: Mock;
  whereDeleteMock: Mock;
  setMock: Mock;
  valuesMock: Mock;
  orderByMock: Mock;
  whereSelectMock: Mock;
  fromMock: Mock;
  deleteMock: Mock;
  txMock: TxMocks;
}

describe("Server Actions", () => {
  const mocks = (db as unknown as { _mocks: DBMocks })._mocks;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryMock.customers.findFirst.mockReset();
    mocks.queryMock.transactions.findFirst.mockReset();
    mocks.returningMock.mockReset();
    mocks.orderByMock.mockReset();
    mocks.whereDeleteMock.mockClear();
    mocks.deleteMock.mockImplementation(() => ({
      where: mocks.whereDeleteMock,
    }));
  });

  describe("getLedger", () => {
    it("returns customer, transactions, and pending transaction", async () => {
      const customer = {
        id: "c1",
        name: "Ali",
        phone: "03001234567",
        totalBalance: 100,
      };
      const txns = [
        {
          id: "t1",
          customerId: "c1",
          date: new Date("2026-04-25T08:00:00.000Z"),
          description: "Milk",
          originalAmount: 100,
          remainingBalance: 100,
          type: "CREDIT",
          approval: "VERIFIED",
          settlement: "UNPAID",
        },
      ];
      const pending = {
        id: "t2",
        customerId: "c1",
        date: new Date("2026-04-25T09:00:00.000Z"),
        description: "Bread",
        originalAmount: 50,
        remainingBalance: 50,
        type: "CREDIT",
        approval: "PENDING",
        settlement: "UNPAID",
      };

      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(customer);
      mocks.orderByMock.mockResolvedValueOnce(txns);
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce(pending);

      const result = await getLedger("c1");

      expect(result).toEqual({
        ok: true,
        ledgerData: {
          customer,
          transactions: txns,
          pendingTransaction: pending,
        },
      });
    });

    it("returns null pendingTransaction when none exists", async () => {
      const customer = {
        id: "c1",
        name: "Ali",
        phone: "03001234567",
        totalBalance: 100,
      };
      const txns = [
        {
          id: "t1",
          customerId: "c1",
          date: new Date("2026-04-25T08:00:00.000Z"),
          description: "Milk",
          originalAmount: 100,
          remainingBalance: 100,
          type: "CREDIT",
          approval: "VERIFIED",
          settlement: "UNPAID",
        },
      ];

      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(customer);
      mocks.orderByMock.mockResolvedValueOnce(txns);
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce(undefined);

      const result = await getLedger("c1");

      expect(result).toEqual({
        ok: true,
        ledgerData: { customer, transactions: txns, pendingTransaction: null },
      });
    });

    it("returns an error when customer does not exist", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(null);

      await expect(getLedger("missing-customer")).resolves.toEqual({
        ok: false,
        error: "Customer not found",
      });
    });

    it("reconciles stale credit statuses so debt matches outstanding credits", async () => {
      const customer = {
        id: "c1",
        name: "Abdul Moiz",
        phone: "03264165918",
        totalBalance: 375,
      };
      const txns = [
        {
          id: "c1-credit",
          customerId: "c1",
          date: new Date("2026-04-25T20:26:00.000Z"),
          description: "1 Dozen Eggs",
          originalAmount: 305,
          remainingBalance: 0,
          type: "CREDIT",
          approval: "VERIFIED",
          settlement: "SETTLED",
        },
        {
          id: "pay-1",
          customerId: "c1",
          date: new Date("2026-04-25T20:26:30.000Z"),
          description: "Payment received",
          originalAmount: 500,
          remainingBalance: 0,
          type: "PAYMENT",
          approval: "VERIFIED",
          settlement: "SETTLED",
        },
        {
          id: "c2-credit",
          customerId: "c1",
          date: new Date("2026-04-25T20:27:00.000Z"),
          description: "Some Snacks",
          originalAmount: 120,
          remainingBalance: 0,
          type: "CREDIT",
          approval: "VERIFIED",
          settlement: "SETTLED",
        },
        {
          id: "c3-credit",
          customerId: "c1",
          date: new Date("2026-04-25T21:40:00.000Z"),
          description: "2 Chocolates",
          originalAmount: 200,
          remainingBalance: 0,
          type: "CREDIT",
          approval: "VERIFIED",
          settlement: "SETTLED",
        },
        {
          id: "c4-credit",
          customerId: "c1",
          date: new Date("2026-04-25T23:16:00.000Z"),
          description: "5 Lays",
          originalAmount: 250,
          remainingBalance: 70,
          type: "CREDIT",
          approval: "VERIFIED",
          settlement: "PARTIAL",
        },
      ];

      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(customer);
      mocks.orderByMock.mockResolvedValueOnce(txns);
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce(undefined);

      const result = await getLedger("c1");

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.ledgerData.customer.totalBalance).toBe(375);

      const c3 = result.ledgerData.transactions.find(
        (txn) => txn.id === "c3-credit",
      );
      const c4 = result.ledgerData.transactions.find(
        (txn) => txn.id === "c4-credit",
      );

      expect(c3?.remainingBalance).toBe(125);
      expect(c3?.settlement).toBe("PARTIAL");
      expect(c4?.remainingBalance).toBe(250);
      expect(c4?.settlement).toBe("UNPAID");
    });
  });

  describe("processPayment", () => {
    it("returns an error when payment amount is not positive", async () => {
      await expect(processPayment("c1", 0)).resolves.toEqual({
        ok: false,
        error: "Payment amount must be positive",
      });
    });

    it("returns an error when customer does not exist", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(null);

      await expect(processPayment("missing", 100)).resolves.toEqual({
        ok: false,
        error: "Customer not found",
      });
    });

    it("applies FIFO correctly to multiple UNPAID transactions", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({
        id: "c1",
        totalBalance: 300,
      });

      const t1 = { id: "t1", remainingBalance: 100, approval: "VERIFIED" };
      const t2 = { id: "t2", remainingBalance: 200, approval: "VERIFIED" };

      mocks.orderByMock.mockResolvedValueOnce([t1, t2]);

      const paymentTxn = { id: "p1", originalAmount: 150 };
      mocks.returningMock.mockResolvedValueOnce([paymentTxn]);

      const result = await processPayment("c1", 150);

      expect(mocks.setMock).toHaveBeenCalledWith({
        remainingBalance: 0,
        settlement: "SETTLED",
      });

      expect(mocks.setMock).toHaveBeenCalledWith({
        remainingBalance: 150,
        settlement: "PARTIAL",
      });

      expect(mocks.setMock).toHaveBeenCalledWith({ totalBalance: 150 });

      expect(result).toEqual({
        ok: true,
        paymentTransaction: paymentTxn,
        newBalance: 150,
        surplus: 0,
      });
    });

    it("handles Advanced Credit logic when payment exceeds debt", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({
        id: "c1",
        totalBalance: 100,
      });

      const t1 = { id: "t1", remainingBalance: 100, approval: "VERIFIED" };

      mocks.orderByMock.mockResolvedValueOnce([t1]);

      const paymentTxn = { id: "p1", originalAmount: 150 };
      mocks.returningMock.mockResolvedValueOnce([paymentTxn]);

      const result = await processPayment("c1", 150);

      expect(mocks.setMock).toHaveBeenCalledWith({
        remainingBalance: 0,
        settlement: "SETTLED",
      });

      expect(mocks.setMock).toHaveBeenCalledWith({ totalBalance: -50 });

      expect(result).toEqual({
        ok: true,
        paymentTransaction: paymentTxn,
        newBalance: -50,
        surplus: 50,
      });
    });
  });

  describe("deleteCustomer", () => {
    it("returns an error when customer does not exist", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(null);

      await expect(deleteCustomer("missing")).resolves.toEqual({
        ok: false,
        error: "Customer not found",
      });
    });

    it("requires explicit acknowledgment when customer has non-zero debt", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({
        id: "c1",
        totalBalance: 100,
      });
      mocks.orderByMock.mockResolvedValueOnce([
        {
          id: "t1",
          customerId: "c1",
          date: new Date("2026-04-25T08:00:00.000Z"),
          description: "Milk",
          originalAmount: 100,
          remainingBalance: 100,
          type: "CREDIT",
          approval: "VERIFIED",
          settlement: "UNPAID",
        },
      ]);

      const result = await deleteCustomer("c1");

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error).toContain(
        "Confirm you have already received debt before deleting",
      );
      expect(mocks.txMock.delete).not.toHaveBeenCalled();
    });

    it("deletes customer with non-zero balance when acknowledgment is provided", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({
        id: "c1",
        totalBalance: 50,
      });
      mocks.orderByMock.mockResolvedValueOnce([
        {
          id: "t1",
          customerId: "c1",
          date: new Date("2026-04-25T08:00:00.000Z"),
          description: "Milk",
          originalAmount: 50,
          remainingBalance: 50,
          type: "CREDIT",
          approval: "VERIFIED",
          settlement: "UNPAID",
        },
      ]);

      const result = await deleteCustomer("c1", true);

      expect(result).toEqual({ ok: true });
      expect(mocks.txMock.delete).toHaveBeenCalledTimes(2);
      expect(mocks.whereDeleteMock).toHaveBeenCalledTimes(2);
    });

    it("deletes transactions and customer when balance is zero", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({
        id: "c1",
        totalBalance: 0,
      });
      mocks.orderByMock.mockResolvedValueOnce([]);

      const result = await deleteCustomer("c1");

      expect(result).toEqual({ ok: true });
      expect(mocks.txMock.delete).toHaveBeenCalledTimes(2);
      expect(mocks.whereDeleteMock).toHaveBeenCalledTimes(2);
    });
  });
});
