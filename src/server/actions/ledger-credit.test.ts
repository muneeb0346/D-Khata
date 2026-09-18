import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  addPendingCredit,
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

  describe("addPendingCredit", () => {
    it("returns an error when customer does not exist", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(null);

      await expect(
        addPendingCredit("missing", { description: "Milk", amount: 100 }),
      ).resolves.toEqual({ ok: false, error: "Customer not found" });
    });

    it("returns an error if there is already a pending transaction", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({
        id: "c1",
        totalBalance: 0,
      });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce({
        id: "t1",
        approval: "PENDING",
      });

      await expect(
        addPendingCredit("c1", { description: "Milk", amount: 100 }),
      ).resolves.toEqual({
        ok: false,
        error:
          "Account is locked: a PENDING transaction must be verified before new credit can be added.",
      });
    });

    it("adds pending credit successfully when no pending transactions exist", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({
        id: "c1",
        totalBalance: 0,
      });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce(null);

      const newTxn = {
        id: "t1",
        approval: "PENDING",
        settlement: "UNPAID",
        remainingBalance: 100,
      };
      mocks.returningMock.mockResolvedValueOnce([newTxn]);

      const result = await addPendingCredit("c1", {
        description: "Milk",
        amount: 100,
      });

      expect(result).toEqual({ ok: true, transaction: newTxn });
      expect(mocks.txMock.insert).toHaveBeenCalled();
      expect(mocks.txMock.update).toHaveBeenCalled();
    });

    it("returns an error when description is empty and amount is zero", async () => {
      await expect(
        addPendingCredit("c1", { description: "", amount: 0 }),
      ).resolves.toEqual({ ok: false, error: "Description is required." });
    });
  });
});
