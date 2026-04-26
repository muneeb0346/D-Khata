import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  createCustomer,
  updateCustomer,
  getLedger,
  addPendingCredit,
  resolveTransaction,
  processPayment,
  deleteCustomer,
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

describe('Server Actions', () => {
  const mocks = (db as unknown as { _mocks: DBMocks })._mocks;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryMock.customers.findFirst.mockReset();
    mocks.queryMock.transactions.findFirst.mockReset();
    mocks.returningMock.mockReset();
    mocks.orderByMock.mockReset();
    mocks.whereDeleteMock.mockClear();
    mocks.deleteMock.mockImplementation(() => ({ where: mocks.whereDeleteMock }));
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

      expect(result).toEqual({ ok: true, customer: mockCustomer });
      expect(db.insert).toHaveBeenCalled();
      if (result.ok) {
        expect(result.customer.totalBalance).toBe(0);
      }
    });

    it('returns an error when name is invalid', async () => {
      await expect(
        createCustomer({ name: 'Ali123', phone: '03001234567' })
      ).resolves.toEqual({ ok: false, error: 'Name is required.' });
    });

    it('returns an error when phone is invalid', async () => {
      await expect(
        createCustomer({ name: 'Ali Khan', phone: '1234' })
      ).resolves.toEqual({ ok: false, error: 'Phone must be 11 digits.' });
    });

    it('returns an error when cnic format is invalid', async () => {
      await expect(
        createCustomer({ name: 'Ali Khan', phone: '03001234567', cnic: '123' })
      ).resolves.toEqual({ ok: false, error: 'CNIC must follow the format xxxxx-xxxxxxx-x.' });
    });

    it('returns an error when another customer already exists by phone', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'existing' });

      await expect(
        createCustomer({ name: 'Ali Khan', phone: '03001234567' })
      ).resolves.toEqual({ ok: false, error: 'A customer with this phone number or CNIC already exists.' });
    });

    it('returns an error when another customer already exists by cnic', async () => {
      mocks.queryMock.customers.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing-cnic' });

      await expect(
        createCustomer({ name: 'Ali Khan', phone: '03001234567', cnic: '12345-1234567-1' })
      ).resolves.toEqual({ ok: false, error: 'A customer with this phone number or CNIC already exists.' });
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

      expect(result).toEqual({ ok: true, customer: updatedCustomer });
      expect(db.update).toHaveBeenCalled();
    });

    it('returns an error when another customer exists during update', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c2' });

      await expect(
        updateCustomer('c1', { name: 'Ali', phone: '03001234567' })
      ).resolves.toEqual({ ok: false, error: 'Another customer with this phone number or CNIC already exists.' });
    });
  });

  describe('getLedger', () => {
    it('returns customer, transactions, and pending transaction', async () => {
      const customer = { id: 'c1', name: 'Ali', phone: '03001234567', totalBalance: 100 };
      const txns = [{
        id: 't1',
        customerId: 'c1',
        date: new Date('2026-04-25T08:00:00.000Z'),
        description: 'Milk',
        originalAmount: 100,
        remainingBalance: 100,
        type: 'CREDIT',
        approval: 'VERIFIED',
        settlement: 'UNPAID',
      }];
      const pending = {
        id: 't2',
        customerId: 'c1',
        date: new Date('2026-04-25T09:00:00.000Z'),
        description: 'Bread',
        originalAmount: 50,
        remainingBalance: 50,
        type: 'CREDIT',
        approval: 'PENDING',
        settlement: 'UNPAID',
      };

      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(customer);
      mocks.orderByMock.mockResolvedValueOnce(txns);
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce(pending);

      const result = await getLedger('c1');

      expect(result).toEqual({ ok: true, ledgerData: { customer, transactions: txns, pendingTransaction: pending } });
    });

    it('returns null pendingTransaction when none exists', async () => {
      const customer = { id: 'c1', name: 'Ali', phone: '03001234567', totalBalance: 100 };
      const txns = [{
        id: 't1',
        customerId: 'c1',
        date: new Date('2026-04-25T08:00:00.000Z'),
        description: 'Milk',
        originalAmount: 100,
        remainingBalance: 100,
        type: 'CREDIT',
        approval: 'VERIFIED',
        settlement: 'UNPAID',
      }];

      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(customer);
      mocks.orderByMock.mockResolvedValueOnce(txns);
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce(undefined);

      const result = await getLedger('c1');

      expect(result).toEqual({ ok: true, ledgerData: { customer, transactions: txns, pendingTransaction: null } });
    });

    it('returns an error when customer does not exist', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(null);

      await expect(getLedger('missing-customer')).resolves.toEqual({ ok: false, error: 'Customer not found' });
    });

    it('reconciles stale credit statuses so debt matches outstanding credits', async () => {
      const customer = { id: 'c1', name: 'Abdul Moiz', phone: '03264165918', totalBalance: 375 };
      const txns = [
        {
          id: 'c1-credit',
          customerId: 'c1',
          date: new Date('2026-04-25T20:26:00.000Z'),
          description: '1 Dozen Eggs',
          originalAmount: 305,
          remainingBalance: 0,
          type: 'CREDIT',
          approval: 'VERIFIED',
          settlement: 'SETTLED',
        },
        {
          id: 'pay-1',
          customerId: 'c1',
          date: new Date('2026-04-25T20:26:30.000Z'),
          description: 'Payment received',
          originalAmount: 500,
          remainingBalance: 0,
          type: 'PAYMENT',
          approval: 'VERIFIED',
          settlement: 'SETTLED',
        },
        {
          id: 'c2-credit',
          customerId: 'c1',
          date: new Date('2026-04-25T20:27:00.000Z'),
          description: 'Some Snacks',
          originalAmount: 120,
          remainingBalance: 0,
          type: 'CREDIT',
          approval: 'VERIFIED',
          settlement: 'SETTLED',
        },
        {
          id: 'c3-credit',
          customerId: 'c1',
          date: new Date('2026-04-25T21:40:00.000Z'),
          description: '2 Chocolates',
          originalAmount: 200,
          remainingBalance: 0,
          type: 'CREDIT',
          approval: 'VERIFIED',
          settlement: 'SETTLED',
        },
        {
          id: 'c4-credit',
          customerId: 'c1',
          date: new Date('2026-04-25T23:16:00.000Z'),
          description: '5 Lays',
          originalAmount: 250,
          remainingBalance: 70,
          type: 'CREDIT',
          approval: 'VERIFIED',
          settlement: 'PARTIAL',
        },
      ];

      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(customer);
      mocks.orderByMock.mockResolvedValueOnce(txns);
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce(undefined);

      const result = await getLedger('c1');

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.ledgerData.customer.totalBalance).toBe(375);

      const c3 = result.ledgerData.transactions.find((txn) => txn.id === 'c3-credit');
      const c4 = result.ledgerData.transactions.find((txn) => txn.id === 'c4-credit');

      expect(c3?.remainingBalance).toBe(125);
      expect(c3?.settlement).toBe('PARTIAL');
      expect(c4?.remainingBalance).toBe(250);
      expect(c4?.settlement).toBe('UNPAID');
    });
  });

  describe('addPendingCredit', () => {
    it('returns an error when customer does not exist', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(null);

      await expect(
        addPendingCredit('missing', { description: 'Milk', amount: 100 })
      ).resolves.toEqual({ ok: false, error: 'Customer not found' });
    });

    it('returns an error if there is already a pending transaction', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 0 });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce({ id: 't1', approval: 'PENDING' });

      await expect(
        addPendingCredit('c1', { description: 'Milk', amount: 100 })
      ).resolves.toEqual({ ok: false, error: 'Account is locked: a PENDING transaction must be verified before new credit can be added.' });
    });

    it('adds pending credit successfully when no pending transactions exist', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 0 });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce(null);

      const newTxn = { id: 't1', approval: 'PENDING', settlement: 'UNPAID', remainingBalance: 100 };
      mocks.returningMock.mockResolvedValueOnce([newTxn]);

      const result = await addPendingCredit('c1', { description: 'Milk', amount: 100 });

      expect(result).toEqual({ ok: true, transaction: newTxn });
      expect(mocks.txMock.insert).toHaveBeenCalled();
      expect(mocks.txMock.update).toHaveBeenCalled();
    });
  });

  describe('resolveTransaction', () => {
    it('returns an error when customer does not exist', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(null);

      await expect(
        resolveTransaction('c1', 't1', 'VERIFIED')
      ).resolves.toEqual({ ok: false, error: 'Customer not found' });
    });

    it('returns an error when no pending transaction exists', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 0 });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce(null);

      await expect(
        resolveTransaction('c1', 'missing', 'VERIFIED')
      ).resolves.toEqual({ ok: false, error: 'No pending transaction found to resolve' });
    });

    it('verifies a transaction and unlocks ledger', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 100 });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce({ id: 't1', approval: 'PENDING', originalAmount: 100, remainingBalance: 100 });
      mocks.orderByMock.mockResolvedValueOnce([]);

      const updatedTxn = { id: 't1', approval: 'VERIFIED', settlement: 'UNPAID', remainingBalance: 100 };
      mocks.returningMock.mockResolvedValueOnce([updatedTxn]);

      const result = await resolveTransaction('c1', 't1', 'VERIFIED');

      expect(result).toEqual({ ok: true, transaction: updatedTxn });
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

      expect(result).toEqual({ ok: true, transaction: updatedTxn });
      expect(mocks.setMock).toHaveBeenCalledWith({ approval: 'VERIFIED', settlement: 'SETTLED', remainingBalance: 0 });
    });

    it('disputes a transaction, sets it to SETTLED and remainingBalance to 0, subtracts from totalBalance', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 100 });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce({ id: 't1', approval: 'PENDING', originalAmount: 100 });

      const updatedTxn = { id: 't1', approval: 'DISPUTED', settlement: 'SETTLED', remainingBalance: 0 };
      mocks.returningMock.mockResolvedValueOnce([updatedTxn]);

      const result = await resolveTransaction('c1', 't1', 'DISPUTED');

      expect(result).toEqual({ ok: true, transaction: updatedTxn });
      expect(mocks.setMock).toHaveBeenCalledWith({ approval: 'DISPUTED', settlement: 'SETTLED', remainingBalance: 0 });
      expect(mocks.setMock).toHaveBeenCalledWith({ totalBalance: 0 });
    });
  });

  describe('processPayment', () => {
    it('returns an error when payment amount is not positive', async () => {
      await expect(processPayment('c1', 0)).resolves.toEqual({ ok: false, error: 'Payment amount must be positive' });
    });

    it('returns an error when customer does not exist', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(null);

      await expect(processPayment('missing', 100)).resolves.toEqual({ ok: false, error: 'Customer not found' });
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

      expect(result).toEqual({ ok: true, paymentTransaction: paymentTxn, newBalance: 150, surplus: 0 });
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

      expect(result).toEqual({ ok: true, paymentTransaction: paymentTxn, newBalance: -50, surplus: 50 });
    });
  });

  describe('deleteCustomer', () => {
    it('returns an error when customer does not exist', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce(null);

      await expect(deleteCustomer('missing')).resolves.toEqual({ ok: false, error: 'Customer not found' });
    });

    it('requires explicit acknowledgment when customer has non-zero debt', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 100 });
      mocks.orderByMock.mockResolvedValueOnce([
        {
          id: 't1',
          customerId: 'c1',
          date: new Date('2026-04-25T08:00:00.000Z'),
          description: 'Milk',
          originalAmount: 100,
          remainingBalance: 100,
          type: 'CREDIT',
          approval: 'VERIFIED',
          settlement: 'UNPAID',
        },
      ]);

      const result = await deleteCustomer('c1');

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error).toContain('Confirm you have already received debt before deleting');
      expect(mocks.txMock.delete).not.toHaveBeenCalled();
    });

    it('deletes customer with non-zero balance when acknowledgment is provided', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 50 });
      mocks.orderByMock.mockResolvedValueOnce([
        {
          id: 't1',
          customerId: 'c1',
          date: new Date('2026-04-25T08:00:00.000Z'),
          description: 'Milk',
          originalAmount: 50,
          remainingBalance: 50,
          type: 'CREDIT',
          approval: 'VERIFIED',
          settlement: 'UNPAID',
        },
      ]);

      const result = await deleteCustomer('c1', true);

      expect(result).toEqual({ ok: true });
      expect(mocks.txMock.delete).toHaveBeenCalledTimes(2);
      expect(mocks.whereDeleteMock).toHaveBeenCalledTimes(2);
    });

    it('deletes transactions and customer when balance is zero', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 0 });
      mocks.orderByMock.mockResolvedValueOnce([]);

      const result = await deleteCustomer('c1');

      expect(result).toEqual({ ok: true });
      expect(mocks.txMock.delete).toHaveBeenCalledTimes(2);
      expect(mocks.whereDeleteMock).toHaveBeenCalledTimes(2);
    });
  });
});
