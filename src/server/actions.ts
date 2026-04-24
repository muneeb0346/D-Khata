'use server';

import { db } from '@/server/db';
import { customers, transactions } from '@/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export async function createCustomer(customerData: {
  name: string;
  phone: string;
  address?: string;
  cnic?: string;
}) {
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

  return newCustomer;
}

export async function getLedger(customerId: string) {
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });

  if (!customer) {
    throw new Error('Customer not found');
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

  return { customer, transactions: txns, pendingTransaction };
}

export async function addPendingCredit(
  customerId: string,
  transactionData: { description: string; amount: number }
) {
  return await db.transaction(async (tx) => {
    const customer = await tx.query.customers.findFirst({
      where: eq(customers.id, customerId),
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const existingPending = await tx.query.transactions.findFirst({
      where: and(
        eq(transactions.customerId, customerId),
        eq(transactions.approval, 'PENDING')
      ),
    });

    if (existingPending) {
      throw new Error(
        'Account is locked: a PENDING transaction must be verified before new credit can be added.'
      );
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

    return newTxn;
  });
}

export async function resolveTransaction(
  customerId: string,
  transactionId: string,
  resolution: 'VERIFIED' | 'DISPUTED'
) {
  return await db.transaction(async (tx) => {
    const customer = await tx.query.customers.findFirst({
      where: eq(customers.id, customerId),
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const txn = await tx.query.transactions.findFirst({
      where: and(
        eq(transactions.id, transactionId),
        eq(transactions.customerId, customerId),
        eq(transactions.approval, 'PENDING')
      ),
    });

    if (!txn) {
      throw new Error('No pending transaction found to resolve');
    }

    if (resolution === 'VERIFIED') {
      const [updatedTxn] = await tx
        .update(transactions)
        .set({ approval: 'VERIFIED' })
        .where(eq(transactions.id, transactionId))
        .returning();

      return updatedTxn;
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

    return updatedTxn;
  });
}

export async function processPayment(customerId: string, amount: number) {
  if (amount <= 0) {
    throw new Error('Payment amount must be positive');
  }

  return await db.transaction(async (tx) => {
    const customer = await tx.query.customers.findFirst({
      where: eq(customers.id, customerId),
    });

    if (!customer) {
      throw new Error('Customer not found');
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
        description: `Payment received: Rs. ${amount}`,
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
      paymentTransaction: paymentTxn,
      newBalance,
      surplus: remainingPayment > 0 ? remainingPayment : 0,
    };
  });
}
export async function getCustomers() {
  return await db.query.customers.findMany();
}
