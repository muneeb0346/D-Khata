import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  createCustomer,
  updateCustomer,
  getLedger,
  addPendingCredit,
  resolveTransaction,
  processPayment,
} from './actions';
import { db } from '@/server/db';

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
  ne: vi.fn(),
}));

vi.mock('@/server/db', () => {
  const returningMock = vi.fn();
  const whereMock = vi.fn().mockImplementation(() => {
    return {
      returning: returningMock,
      then: function (resolve: (val: unknown[]) => void) { resolve([]); }
    };
  });

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

  const queryMock = {
    customers: { findFirst: vi.fn() },
    transactions: { findFirst: vi.fn() },
  };

  const txMock = {
    query: queryMock,
    insert: vi.fn().mockReturnValue({ values: valuesMock }),
    update: vi.fn().mockReturnValue({ set: setMock }),
    select: vi.fn().mockReturnValue({ from: fromMock }),
  };

  return {
    db: {
      query: queryMock,
      insert: vi.fn().mockReturnValue({ values: valuesMock }),
      update: vi.fn().mockReturnValue({ set: setMock }),
      select: vi.fn().mockReturnValue({ from: fromMock }),
      transaction: vi.fn(async (cb) => cb(txMock)),
      _mocks: {
        queryMock,
        returningMock,
        whereMock,
        setMock,
        valuesMock,
        orderByMock,
        whereSelectMock,
        fromMock,
        txMock,
      }
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
}

interface DBMocks {
  queryMock: QueryMocks;
  returningMock: Mock;
  whereMock: Mock;
  setMock: Mock;
  valuesMock: Mock;
  orderByMock: Mock;
  whereSelectMock: Mock;
  fromMock: Mock;
  txMock: TxMocks;
}

describe('Server Actions', () => {
  const mocks = (db as unknown as { _mocks: DBMocks })._mocks;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryMock.customers.findFirst.mockReset();
    mocks.queryMock.transactions.findFirst.mockReset();
    mocks.returningMock.mockReset();
    mocks.orderByMock.mockReset();
  });

  describe('createCustomer', () => {
    it('creates a customer with a default total balance of 0', async () => {
      const mockCustomer = {
        id: 'uuid',
        name: 'John Doe',
        phone: '1234567890',
        address: null,
        cnic: null,
        totalBalance: 0
      };
      mocks.returningMock.mockResolvedValueOnce([mockCustomer]);

      const result = await createCustomer({ name: 'John Doe', phone: '1234567890' });

      expect(result).toEqual(mockCustomer);
      expect(db.insert).toHaveBeenCalled();
      expect(result.totalBalance).toBe(0);
    });

    it('throws when name is invalid', async () => {
      await expect(
        createCustomer({ name: 'Ali123', phone: '03001234567' })
      ).rejects.toThrow('Name is required.');
    });

    it('throws when phone is invalid', async () => {
      await expect(
        createCustomer({ name: 'Ali Khan', phone: '1234' })
      ).rejects.toThrow('Phone must be 11 digits.');
    });

    it('throws when cnic format is invalid', async () => {
      await expect(
        createCustomer({ name: 'Ali Khan', phone: '03001234567', cnic: '123' })
      ).rejects.toThrow('CNIC must follow the format xxxxx-xxxxxxx-x.');
    });

    it('throws when another customer already exists by phone', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'existing' });

      await expect(
        createCustomer({ name: 'Ali Khan', phone: '03001234567' })
      ).rejects.toThrow('A customer with this phone number or CNIC already exists.');
    });

    it('throws when another customer already exists by cnic', async () => {
      mocks.queryMock.customers.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing-cnic' });

      await expect(
        createCustomer({ name: 'Ali Khan', phone: '03001234567', cnic: '12345-1234567-1' })
      ).rejects.toThrow('A customer with this phone number or CNIC already exists.');
    });
  });

  describe('updateCustomer', () => {
    it('updates a customer successfully', async () => {
      const updatedCustomer = {
        id: 'c1',
        name: 'Updated Name',
        phone: '03001234567',
        address: 'Street 1',
        cnic: '12345-1234567-1',
      };

      mocks.queryMock.customers.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mocks.returningMock.mockResolvedValueOnce([updatedCustomer]);

      const result = await updateCustomer('c1', {
        name: 'Updated Name',
        phone: '03001234567',
        address: 'Street 1',
        cnic: '12345-1234567-1',
      });

      expect(result).toEqual(updatedCustomer);
      expect(db.update).toHaveBeenCalled();
    });

    it('throws when another customer exists during update', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c2' });

      await expect(
        updateCustomer('c1', { name: 'Ali', phone: '03001234567' })
      ).rejects.toThrow('Another customer with this phone number or CNIC already exists.');
    });
  });

  describe('getLedger', () => {
    it('returns customer, transactions, and pending transaction', async () => {
      const customer = { id: 'c1', name: 'Ali', phone: '03001234567', totalBalance: 100 };
      const txns = [{ id: 't1', remainingBalance: 100 }];
      const pending = { id: 't2', approval: 'PENDING' };

      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(customer);
      mocks.orderByMock.mockResolvedValueOnce(txns);
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce(pending);

      const result = await getLedger('c1');

      expect(result).toEqual({ customer, transactions: txns, pendingTransaction: pending });
    });

    it('returns null pendingTransaction when none exists', async () => {
      const customer = { id: 'c1', name: 'Ali', phone: '03001234567', totalBalance: 100 };
      const txns = [{ id: 't1', remainingBalance: 100 }];

      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(customer);
      mocks.orderByMock.mockResolvedValueOnce(txns);
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce(undefined);

      const result = await getLedger('c1');

      expect(result.pendingTransaction).toBeNull();
      expect(result.transactions).toEqual(txns);
    });

    it('throws when customer does not exist', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(null);

      await expect(getLedger('missing-customer')).rejects.toThrow('Customer not found');
    });
  });

  describe('addPendingCredit', () => {
    it('throws when customer does not exist', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(null);

      await expect(
        addPendingCredit('missing', { description: 'Milk', amount: 100 })
      ).rejects.toThrow('Customer not found');
    });

    it('throws an error if there is already a pending transaction', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 0 });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce({ id: 't1', approval: 'PENDING' });

      await expect(
        addPendingCredit('c1', { description: 'Milk', amount: 100 })
      ).rejects.toThrow('Account is locked: a PENDING transaction must be verified before new credit can be added.');
    });

    it('adds pending credit successfully when no pending transactions exist', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 0 });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce(null);

      const newTxn = { id: 't1', approval: 'PENDING', settlement: 'UNPAID', remainingBalance: 100 };
      mocks.returningMock.mockResolvedValueOnce([newTxn]);

      const result = await addPendingCredit('c1', { description: 'Milk', amount: 100 });

      expect(result).toEqual(newTxn);
      expect(mocks.txMock.insert).toHaveBeenCalled();
      expect(mocks.txMock.update).toHaveBeenCalled();
    });
  });

  describe('resolveTransaction', () => {
    it('throws when customer does not exist', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(null);

      await expect(
        resolveTransaction('c1', 't1', 'VERIFIED')
      ).rejects.toThrow('Customer not found');
    });

    it('throws when no pending transaction exists', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 0 });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce(null);

      await expect(
        resolveTransaction('c1', 'missing', 'VERIFIED')
      ).rejects.toThrow('No pending transaction found to resolve');
    });

    it('verifies a transaction and unlocks ledger', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 100 });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce({ id: 't1', approval: 'PENDING', originalAmount: 100, remainingBalance: 100 });
      mocks.orderByMock.mockResolvedValueOnce([]);

      const updatedTxn = { id: 't1', approval: 'VERIFIED', settlement: 'UNPAID', remainingBalance: 100 };
      mocks.returningMock.mockResolvedValueOnce([updatedTxn]);

      const result = await resolveTransaction('c1', 't1', 'VERIFIED');

      expect(result).toEqual(updatedTxn);
      expect(mocks.txMock.update).toHaveBeenCalled();
      expect(mocks.setMock).toHaveBeenCalledWith({ approval: 'VERIFIED', settlement: 'UNPAID', remainingBalance: 100 });
    });

    it('reconciles pending partial to settled when prior payments already covered it', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 20074 });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce({
        id: 't1',
        approval: 'PENDING',
        originalAmount: 2636,
        remainingBalance: 136,
      });
      mocks.orderByMock.mockResolvedValueOnce([
        { id: 'v1', remainingBalance: 20000 },
        { id: 'v2', remainingBalance: 74 },
      ]);

      const updatedTxn = { id: 't1', approval: 'VERIFIED', settlement: 'SETTLED', remainingBalance: 0 };
      mocks.returningMock.mockResolvedValueOnce([updatedTxn]);

      const result = await resolveTransaction('c1', 't1', 'VERIFIED');

      expect(result).toEqual(updatedTxn);
      expect(mocks.setMock).toHaveBeenCalledWith({ approval: 'VERIFIED', settlement: 'SETTLED', remainingBalance: 0 });
    });

    it('disputes a transaction, sets it to SETTLED and remainingBalance to 0, subtracts from totalBalance', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 100 });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce({ id: 't1', approval: 'PENDING', originalAmount: 100 });

      const updatedTxn = { id: 't1', approval: 'DISPUTED', settlement: 'SETTLED', remainingBalance: 0 };
      mocks.returningMock.mockResolvedValueOnce([updatedTxn]);

      const result = await resolveTransaction('c1', 't1', 'DISPUTED');

      expect(result).toEqual(updatedTxn);
      expect(mocks.setMock).toHaveBeenCalledWith({ approval: 'DISPUTED', settlement: 'SETTLED', remainingBalance: 0 });
      expect(mocks.setMock).toHaveBeenCalledWith({ totalBalance: 0 });
    });
  });

  describe('processPayment', () => {
    it('throws when payment amount is not positive', async () => {
      await expect(processPayment('c1', 0)).rejects.toThrow('Payment amount must be positive');
    });

    it('throws when customer does not exist', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(null);

      await expect(processPayment('missing', 100)).rejects.toThrow('Customer not found');
    });

    it('applies FIFO correctly to multiple UNPAID transactions', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 300 });

      const t1 = { id: 't1', remainingBalance: 100, approval: 'VERIFIED' };
      const t2 = { id: 't2', remainingBalance: 200, approval: 'VERIFIED' };

      mocks.orderByMock.mockResolvedValueOnce([t1, t2]);

      const paymentTxn = { id: 'p1', originalAmount: 150 };
      mocks.returningMock.mockResolvedValueOnce([paymentTxn]);

      const result = await processPayment('c1', 150);

      expect(mocks.setMock).toHaveBeenCalledWith({ remainingBalance: 0, settlement: 'SETTLED' });

      expect(mocks.setMock).toHaveBeenCalledWith({ remainingBalance: 150, settlement: 'PARTIAL' });

      expect(mocks.setMock).toHaveBeenCalledWith({ totalBalance: 150 });

      expect(result.newBalance).toBe(150);
      expect(result.surplus).toBe(0);
    });

    it('handles Advanced Credit logic when payment exceeds debt', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 100 });

      const t1 = { id: 't1', remainingBalance: 100, approval: 'VERIFIED' };

      mocks.orderByMock.mockResolvedValueOnce([t1]);

      const paymentTxn = { id: 'p1', originalAmount: 150 };
      mocks.returningMock.mockResolvedValueOnce([paymentTxn]);

      const result = await processPayment('c1', 150);

      expect(mocks.setMock).toHaveBeenCalledWith({ remainingBalance: 0, settlement: 'SETTLED' });

      expect(mocks.setMock).toHaveBeenCalledWith({ totalBalance: -50 });

      expect(result.newBalance).toBe(-50);
      expect(result.surplus).toBe(50);
    });
  });
});
