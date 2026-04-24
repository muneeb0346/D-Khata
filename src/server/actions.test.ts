import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createCustomer,
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
}));

vi.mock('@/server/db', () => {
  const returningMock = vi.fn();
  const whereMock = vi.fn().mockImplementation(() => {
    return {
      returning: returningMock,
      then: function(resolve: any) { resolve([]); } 
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

describe('Server Actions', () => {
  const mocks = (db as any)._mocks;

  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  describe('addPendingCredit', () => {
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
    it('verifies a transaction and unlocks ledger', async () => {
      mocks.queryMock.customers.findFirst.mockResolvedValueOnce({ id: 'c1', totalBalance: 0 });
      mocks.queryMock.transactions.findFirst.mockResolvedValueOnce({ id: 't1', approval: 'PENDING' });
      
      const updatedTxn = { id: 't1', approval: 'VERIFIED' };
      mocks.returningMock.mockResolvedValueOnce([updatedTxn]);

      const result = await resolveTransaction('c1', 't1', 'VERIFIED');
      
      expect(result).toEqual(updatedTxn);
      expect(mocks.txMock.update).toHaveBeenCalled();
      expect(mocks.setMock).toHaveBeenCalledWith({ approval: 'VERIFIED' });
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
