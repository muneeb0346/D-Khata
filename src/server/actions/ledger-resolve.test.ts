import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  resolveTransaction,
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

  describe("resolveTransaction", () => {
    it("returns an error when customer does not exist", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(null);

      await expect(resolveTransaction("c1", "t1", "VERIFIED")).resolves.toEqual(
        { ok: false, error: "Customer not found" },
      );
    });

    it("returns an error when no pending transaction exists", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({
        id: "c1",
        totalBalance: 0,
      });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce(null);

      await expect(
        resolveTransaction("c1", "missing", "VERIFIED"),
      ).resolves.toEqual({
        ok: false,
        error: "No pending transaction found to resolve",
      });
    });

    it("verifies a transaction and unlocks ledger", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({
        id: "c1",
        totalBalance: 100,
      });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce({
        id: "t1",
        approval: "PENDING",
        originalAmount: 100,
        remainingBalance: 100,
      });
      mocks.orderByMock.mockResolvedValueOnce([]);

      const updatedTxn = {
        id: "t1",
        approval: "VERIFIED",
        settlement: "UNPAID",
        remainingBalance: 100,
      };
      mocks.returningMock.mockResolvedValueOnce([updatedTxn]);

      const result = await resolveTransaction("c1", "t1", "VERIFIED");

      expect(result).toEqual({ ok: true, transaction: updatedTxn });
      expect(mocks.txMock.update).toHaveBeenCalled();
      expect(mocks.setMock).toHaveBeenCalledWith({
        approval: "VERIFIED",
        settlement: "UNPAID",
        remainingBalance: 100,
      });
    });

    it("reconciles pending partial to settled when prior payments already covered it", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({
        id: "c1",
        totalBalance: 20074,
      });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce({
        id: "t1",
        approval: "PENDING",
        originalAmount: 2636,
        remainingBalance: 136,
      });
      mocks.orderByMock.mockResolvedValueOnce([
        { id: "v1", remainingBalance: 20000 },
        { id: "v2", remainingBalance: 74 },
      ]);

      const updatedTxn = {
        id: "t1",
        approval: "VERIFIED",
        settlement: "SETTLED",
        remainingBalance: 0,
      };
      mocks.returningMock.mockResolvedValueOnce([updatedTxn]);

      const result = await resolveTransaction("c1", "t1", "VERIFIED");

      expect(result).toEqual({ ok: true, transaction: updatedTxn });
      expect(mocks.setMock).toHaveBeenCalledWith({
        approval: "VERIFIED",
        settlement: "SETTLED",
        remainingBalance: 0,
      });
    });

    it("disputes a transaction, sets it to SETTLED and remainingBalance to 0, subtracts from totalBalance", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({
        id: "c1",
        totalBalance: 100,
      });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce({
        id: "t1",
        approval: "PENDING",
        originalAmount: 100,
      });

      const updatedTxn = {
        id: "t1",
        approval: "DISPUTED",
        settlement: "SETTLED",
        remainingBalance: 0,
      };
      mocks.returningMock.mockResolvedValueOnce([updatedTxn]);

      const result = await resolveTransaction("c1", "t1", "DISPUTED");

      expect(result).toEqual({ ok: true, transaction: updatedTxn });
      expect(mocks.setMock).toHaveBeenCalledWith({
        approval: "DISPUTED",
        settlement: "SETTLED",
        remainingBalance: 0,
      });
      expect(mocks.setMock).toHaveBeenCalledWith({ totalBalance: 0 });
    });
  });
});
