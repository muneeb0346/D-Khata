'use server';

import { db } from '@/server/db';
import { customers, transactions } from '@/server/db/schema';
import { eq, and, asc, ne } from 'drizzle-orm';
import type { Customer, LedgerData, Transaction } from '@/types';

type CustomerPayload = {
  name: string;
  phone: string;
  address?: string;
  cnic?: string;
};

type ActionFailure = { ok: false; error: string };
type CustomerActionResult = { ok: true; customer: Customer } | ActionFailure;
type LedgerActionResult = { ok: true; ledgerData: LedgerData } | ActionFailure;
type TransactionActionResult = { ok: true; transaction: Transaction } | ActionFailure;
type PaymentActionResult = {
  ok: true;
  paymentTransaction: Transaction;
  newBalance: number;
  surplus: number;
} | ActionFailure;

function hasValidPhone(phone: string) {
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 10 && digitsOnly.length <= 11;
}

export async function updateCustomer(customerId: string, customerData: {
  name: string;
  phone: string;
  address?: string;
  cnic?: string;
}): Promise<CustomerActionResult> {
  if (!customerData.name || /\d/.test(customerData.name)) {
    return { ok: false, error: 'Name is required.' };
  }

  if (!hasValidPhone(customerData.phone)) {
    return { ok: false, error: 'Phone must be 11 digits.' };
  }

  if (customerData.cnic && !/^\d{5}-\d{7}-\d{1}$/.test(customerData.cnic)) {
    return { ok: false, error: 'CNIC must follow the format xxxxx-xxxxxxx-x.' };
  }

  const existingCustomerByPhone = await db.query.customers.findFirst({
    where: and(
      eq(customers.phone, customerData.phone),
      ne(customers.id, customerId)
    ),
  });

  const existingCustomerByCnic = customerData.cnic
    ? await db.query.customers.findFirst({
      where: and(
        eq(customers.cnic, customerData.cnic),
        ne(customers.id, customerId)
      ),
    })
    : null;

  const existingCustomer = existingCustomerByPhone ?? existingCustomerByCnic;

  if (existingCustomer) {
    return { ok: false, error: 'Another customer with this phone number or CNIC already exists.' };
  }

  const [updatedCustomer] = await db
    .update(customers)
    .set({
      name: customerData.name,
      phone: customerData.phone,
      address: customerData.address ?? null,
      cnic: customerData.cnic ?? null,
    })
    .where(eq(customers.id, customerId))
    .returning();

  return { ok: true, customer: updatedCustomer };
}

export async function createCustomer(customerData: CustomerPayload): Promise<CustomerActionResult> {
  if (!customerData.name || /\d/.test(customerData.name)) {
    return { ok: false, error: 'Name is required.' };
  }

  if (!hasValidPhone(customerData.phone)) {
    return { ok: false, error: 'Phone must be 11 digits.' };
  }

  if (customerData.cnic && !/^\d{5}-\d{7}-\d{1}$/.test(customerData.cnic)) {
    return { ok: false, error: 'CNIC must follow the format xxxxx-xxxxxxx-x.' };
  }
  const existingCustomerByPhone = await db.query.customers.findFirst({
    where: eq(customers.phone, customerData.phone),
  });

  const existingCustomerByCnic = customerData.cnic
    ? await db.query.customers.findFirst({
      where: eq(customers.cnic, customerData.cnic),
    })
    : null;

  const existingCustomer = existingCustomerByPhone ?? existingCustomerByCnic;

  if (existingCustomer) {
    return { ok: false, error: 'A customer with this phone number or CNIC already exists.' };
  }

  const id = crypto.randomUUID();

  const [newCustomer] = await db
    .insert(customers)
    .values({
      id,
      name: customerData.name,
      phone: customerData.phone,
      address: customerData.address ?? null,
      cnic: customerData.cnic ?? null,
    })
    .returning();

  return { ok: true, customer: newCustomer };
}

export async function getLedger(customerId: string): Promise<LedgerActionResult> {
  try {
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
    });

    if (!customer) {
      return { ok: false, error: 'Customer not found' };
    }

    const txns = await db
      .select()
      .from(transactions)
      .where(eq(transactions.customerId, customerId))
      .orderBy(asc(transactions.date));

    const pendingTransaction = await db.query.transactions.findFirst({
      where: and(
        eq(transactions.customerId, customerId),
        eq(transactions.approval, 'PENDING')
      ),
    }) ?? null;

    return { ok: true, ledgerData: { customer, transactions: txns, pendingTransaction } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to load ledger.' };
  }
}

export async function addPendingCredit(
  customerId: string,
  transactionData: { description: string; amount: number }
): Promise<TransactionActionResult> {
  try {
    return await db.transaction(async (tx) => {
      const customer = await tx.query.customers.findFirst({
        where: eq(customers.id, customerId),
      });

      if (!customer) {
        return { ok: false, error: 'Customer not found' };
      }

      const existingPending = await tx.query.transactions.findFirst({
        where: and(
          eq(transactions.customerId, customerId),
          eq(transactions.approval, 'PENDING')
        ),
      });

      if (existingPending) {
        return {
          ok: false,
          error: 'Account is locked: a PENDING transaction must be verified before new credit can be added.',
        };
      }

      const currentBalance = customer.totalBalance ?? 0;
      let effectiveAmount = transactionData.amount;
      let settlement: 'UNPAID' | 'PARTIAL' | 'SETTLED' = 'UNPAID';

      if (currentBalance < 0) {
        const advanceAvailable = Math.abs(currentBalance);

        if (advanceAvailable >= effectiveAmount) {
          settlement = 'SETTLED';
          effectiveAmount = 0;
        } else {
          settlement = 'PARTIAL';
          effectiveAmount = effectiveAmount - advanceAvailable;
        }
      }

      const txnId = crypto.randomUUID();

      const [newTxn] = await tx
        .insert(transactions)
        .values({
          id: txnId,
          customerId,
          description: transactionData.description,
          originalAmount: transactionData.amount,
          remainingBalance: effectiveAmount,
          type: 'CREDIT',
          approval: 'PENDING',
          settlement,
        })
        .returning();

      await tx
        .update(customers)
        .set({ totalBalance: currentBalance + transactionData.amount })
        .where(eq(customers.id, customerId));

      return { ok: true, transaction: newTxn };
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to add credit.' };
  }
}

export async function resolveTransaction(
  customerId: string,
  transactionId: string,
  resolution: 'VERIFIED' | 'DISPUTED'
): Promise<TransactionActionResult> {
  try {
    return await db.transaction(async (tx) => {
      const customer = await tx.query.customers.findFirst({
        where: eq(customers.id, customerId),
      });

      if (!customer) {
        return { ok: false, error: 'Customer not found' };
      }

      const txn = await tx.query.transactions.findFirst({
        where: and(
          eq(transactions.id, transactionId),
          eq(transactions.customerId, customerId),
          eq(transactions.approval, 'PENDING')
        ),
      });

      if (!txn) {
        return { ok: false, error: 'No pending transaction found to resolve' };
      }

      if (resolution === 'VERIFIED') {
        const verifiedOpenTxns = await tx
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.customerId, customerId),
              eq(transactions.approval, 'VERIFIED'),
              eq(transactions.type, 'CREDIT')
            )
          )
          .orderBy(asc(transactions.date)) ?? [];

        const verifiedOpenBalance = verifiedOpenTxns
          .filter((t) => t.remainingBalance > 0)
          .reduce((sum, t) => sum + t.remainingBalance, 0);

        const normalizedRemaining = Math.max(0, (customer.totalBalance ?? 0) - verifiedOpenBalance);
        const nextRemaining = Math.min(txn.remainingBalance, normalizedRemaining);
        const nextSettlement = nextRemaining === 0
          ? 'SETTLED'
          : (nextRemaining < txn.originalAmount ? 'PARTIAL' : 'UNPAID');

        const [updatedTxn] = await tx
          .update(transactions)
          .set({
            approval: 'VERIFIED',
            remainingBalance: nextRemaining,
            settlement: nextSettlement,
          })
          .where(eq(transactions.id, transactionId))
          .returning();

        return { ok: true, transaction: updatedTxn };
      }

      const [updatedTxn] = await tx
        .update(transactions)
        .set({ approval: 'DISPUTED', settlement: 'SETTLED', remainingBalance: 0 })
        .where(eq(transactions.id, transactionId))
        .returning();

      const currentBalance = customer.totalBalance ?? 0;
      await tx
        .update(customers)
        .set({ totalBalance: currentBalance - txn.originalAmount })
        .where(eq(customers.id, customerId));

      return { ok: true, transaction: updatedTxn };
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to resolve transaction.' };
  }
}

export async function processPayment(customerId: string, amount: number): Promise<PaymentActionResult> {
  if (amount <= 0) {
    return { ok: false, error: 'Payment amount must be positive' };
  }

  try {
    return await db.transaction(async (tx) => {
      const customer = await tx.query.customers.findFirst({
        where: eq(customers.id, customerId),
      });

      if (!customer) {
        return { ok: false, error: 'Customer not found' };
      }

      const outstandingTxns = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.customerId, customerId),
            eq(transactions.type, 'CREDIT'),
            eq(transactions.approval, 'VERIFIED')
          )
        )
        .orderBy(asc(transactions.date));

      const unpaidTxns = outstandingTxns.filter((t) => t.remainingBalance > 0);

      let remainingPayment = amount;

      for (const txn of unpaidTxns) {
        if (remainingPayment <= 0) break;

        if (remainingPayment >= txn.remainingBalance) {
          remainingPayment -= txn.remainingBalance;

          await tx
            .update(transactions)
            .set({ remainingBalance: 0, settlement: 'SETTLED' })
            .where(eq(transactions.id, txn.id));
        } else {
          const newRemaining = txn.remainingBalance - remainingPayment;
          remainingPayment = 0;

          await tx
            .update(transactions)
            .set({ remainingBalance: newRemaining, settlement: 'PARTIAL' })
            .where(eq(transactions.id, txn.id));
        }
      }

      const paymentTxnId = crypto.randomUUID();

      const [paymentTxn] = await tx
        .insert(transactions)
        .values({
          id: paymentTxnId,
          customerId,
          description: 'Payment received',
          originalAmount: amount,
          remainingBalance: 0,
          type: 'PAYMENT',
          approval: 'VERIFIED',
          settlement: 'SETTLED',
        })
        .returning();

      const currentBalance = customer.totalBalance ?? 0;
      const newBalance = currentBalance - amount;

      await tx
        .update(customers)
        .set({ totalBalance: newBalance })
        .where(eq(customers.id, customerId));

      return {
        ok: true,
        paymentTransaction: paymentTxn,
        newBalance,
        surplus: remainingPayment > 0 ? remainingPayment : 0,
      };
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to process payment.' };
  }
}

export async function getCustomers() {
  return await db.query.customers.findMany();
}
