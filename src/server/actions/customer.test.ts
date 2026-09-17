import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { createCustomer, updateCustomer } from "@/server/actions";
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

  describe("createCustomer", () => {
    it("creates a customer with a default total balance of 0", async () => {
      const mockCustomer = {
        id: "uuid",
        name: "John Doe",
        phone: "03001234567",
        address: null,
        cnic: null,
        totalBalance: 0,
      };
      mocks.returningMock.mockResolvedValueOnce([mockCustomer]);

      const result = await createCustomer({
        name: "John Doe",
        phone: "03001234567",
      });

      expect(result).toEqual({ ok: true, customer: mockCustomer });
      expect(db.insert).toHaveBeenCalled();
      if (result.ok) {
        expect(result.customer.totalBalance).toBe(0);
      }
    });

    it("returns an error when name is invalid", async () => {
      await expect(
        createCustomer({ name: "Ali123", phone: "03001234567" }),
      ).resolves.toEqual({ ok: false, error: "Name is required." });
    });

    it("returns an error when phone is invalid", async () => {
      await expect(
        createCustomer({ name: "Ali Khan", phone: "1234" }),
      ).resolves.toEqual({
        ok: false,
        error: "Phone must be 11 digits starting with 03.",
      });
    });

    it("returns an error when cnic format is invalid", async () => {
      await expect(
        createCustomer({ name: "Ali Khan", phone: "03001234567", cnic: "123" }),
      ).resolves.toEqual({
        ok: false,
        error: "CNIC must follow the format xxxxx-xxxxxxx-x.",
      });
    });

    it("returns an error when another customer already exists by phone", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({
        id: "existing",
      });

      await expect(
        createCustomer({ name: "Ali Khan", phone: "03001234567" }),
      ).resolves.toEqual({
        ok: false,
        error: "A customer with this phone number or CNIC already exists.",
      });
    });

    it("returns an error when another customer already exists by cnic", async () => {
      mocks.queryMock.customers.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "existing-cnic" });

      await expect(
        createCustomer({
          name: "Ali Khan",
          phone: "03001234567",
          cnic: "12345-1234567-1",
        }),
      ).resolves.toEqual({
        ok: false,
        error: "A customer with this phone number or CNIC already exists.",
      });
    });

    it("returns an error when name is empty", async () => {
      await expect(
        createCustomer({ name: "", phone: "03001234567" }),
      ).resolves.toEqual({ ok: false, error: "Name is required." });
    });

    it("returns an error when phone format is invalid", async () => {
      await expect(
        createCustomer({ name: "Ali", phone: "123" }),
      ).resolves.toEqual({
        ok: false,
        error: "Phone must be 11 digits starting with 03.",
      });
    });
  });

  describe("updateCustomer", () => {
    it("updates a customer successfully", async () => {
      const updatedCustomer = {
        id: "c1",
        name: "Updated Name",
        phone: "03001234567",
        address: "Street 1",
        cnic: "12345-1234567-1",
      };

      mocks.queryMock.customers.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mocks.returningMock.mockResolvedValueOnce([updatedCustomer]);

      const result = await updateCustomer("c1", {
        name: "Updated Name",
        phone: "03001234567",
        address: "Street 1",
        cnic: "12345-1234567-1",
      });

      expect(result).toEqual({ ok: true, customer: updatedCustomer });
      expect(db.update).toHaveBeenCalled();
    });

    it("returns an error when another customer exists during update", async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: "c2" });

      await expect(
        updateCustomer("c1", { name: "Ali", phone: "03001234567" }),
      ).resolves.toEqual({
        ok: false,
        error:
          "Another customer with this phone number or CNIC already exists.",
      });
    });
  });
});
