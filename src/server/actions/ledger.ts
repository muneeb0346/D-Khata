"use server";

import { db } from "@/server/db";
import { customers, transactions } from "@/server/db/schema";
import { eq, and, asc } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/utils/logger";
import type { LedgerData, Transaction } from "@/types";
import { reconcileLedger } from "@/server/db/reconcile";
import { CreditPayloadSchema } from "@/server/lib/schemas";
/* eslint-disable @typescript-eslint/no-unused-vars */
function getTxDateValue(txn: Transaction) {
  return new Date(txn.date).getTime();
}

function getDerivedSettlement(
  originalAmount: number,
  remainingBalance: number,
): "UNPAID" | "PARTIAL" | "SETTLED" {
  if (remainingBalance <= 0) return "SETTLED";
  if (remainingBalance < originalAmount) return "PARTIAL";
  return "UNPAID";
}
/* eslint-enable @typescript-eslint/no-unused-vars */

type ActionFailure = { ok: false; error: string };
type LedgerActionResult = { ok: true; ledgerData: LedgerData } | ActionFailure;
type TransactionActionResult = { ok: true; transaction: Transaction } | ActionFailure;
type PaymentActionResult =
  | {
      ok: true;
      paymentTransaction: Transaction;
      newBalance: number;
      surplus: number;
    }
  | ActionFailure;
type DeleteCustomerActionResult = { ok: true } | ActionFailure;

export async function getLedger(customerId: string): Promise<LedgerActionResult> {
  try {
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
    });

    if (!customer) {
      return { ok: false, error: "Customer not found" };
    }

    const txns = await db
      .select()
      .from(transactions)
      .where(eq(transactions.customerId, customerId))
      .orderBy(asc(transactions.date));

    const pendingTransaction =
      (await db.query.transactions.findFirst({
        where: and(eq(transactions.customerId, customerId), eq(transactions.approval, "PENDING")),
      })) ?? null;

    const reconciled = reconcileLedger(customer, txns);
    const reconciledPendingTransaction = pendingTransaction
      ? (reconciled.transactions.find((txn) => txn.id === pendingTransaction.id) ??
        pendingTransaction)
      : null;

    return {
      ok: true,
      ledgerData: {
        customer: reconciled.customer,
        transactions: reconciled.transactions,
        pendingTransaction: reconciledPendingTransaction,
      },
    };
  } catch (error) {
    logger.error("Failed to load ledger", { error });
    Sentry.captureException(error);
    return {
      ok: false,
      error: "Failed to load ledger.",
    };
  }
}

export async function addPendingCredit(
  customerId: string,
  transactionData: { description: string; amount: number },
): Promise<TransactionActionResult> {
  const parsed = CreditPayloadSchema.safeParse(transactionData);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  try {
    return await db.transaction(async (tx) => {
      const customer = await tx.query.customers.findFirst({
        where: eq(customers.id, customerId),
      });

      if (!customer) {
        return { ok: false, error: "Customer not found" };
      }

      const existingPending = await tx.query.transactions.findFirst({
        where: and(eq(transactions.customerId, customerId), eq(transactions.approval, "PENDING")),
      });

      if (existingPending) {
        return {
          ok: false,
          error:
            "Account is locked: a PENDING transaction must be verified before new credit can be added.",
        };
      }

      const currentBalance = customer.totalBalance ?? 0;
      let effectiveAmount = transactionData.amount;
      let settlement: "UNPAID" | "PARTIAL" | "SETTLED" = "UNPAID";

      if (currentBalance < 0) {
        const advanceAvailable = Math.abs(currentBalance);

        if (advanceAvailable >= effectiveAmount) {
          settlement = "SETTLED";
          effectiveAmount = 0;
        } else {
          settlement = "PARTIAL";
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
          type: "CREDIT",
          approval: "PENDING",
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
    logger.error("Failed to add credit", { error });
    Sentry.captureException(error);
    return {
      ok: false,
      error: "Failed to add credit.",
    };
  }
}

export async function resolveTransaction(
  customerId: string,
  transactionId: string,
  resolution: "VERIFIED" | "DISPUTED",
): Promise<TransactionActionResult> {
  try {
    return await db.transaction(async (tx) => {
      const customer = await tx.query.customers.findFirst({
        where: eq(customers.id, customerId),
      });

      if (!customer) {
        return { ok: false, error: "Customer not found" };
      }

      const txn = await tx.query.transactions.findFirst({
        where: and(
          eq(transactions.id, transactionId),
          eq(transactions.customerId, customerId),
          eq(transactions.approval, "PENDING"),
        ),
      });

      if (!txn) {
        return { ok: false, error: "No pending transaction found to resolve" };
      }

      if (resolution === "VERIFIED") {
        const verifiedOpenTxns =
          (await tx
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.customerId, customerId),
                eq(transactions.approval, "VERIFIED"),
                eq(transactions.type, "CREDIT"),
              ),
            )
            .orderBy(asc(transactions.date))) ?? [];

        const verifiedOpenBalance = verifiedOpenTxns
          .filter((t) => t.remainingBalance > 0)
          .reduce((sum, t) => sum + t.remainingBalance, 0);

        const normalizedRemaining = Math.max(0, (customer.totalBalance ?? 0) - verifiedOpenBalance);
        const nextRemaining = Math.min(txn.remainingBalance, normalizedRemaining);
        const nextSettlement =
          nextRemaining === 0
            ? "SETTLED"
            : nextRemaining < txn.originalAmount
              ? "PARTIAL"
              : "UNPAID";

        const [updatedTxn] = await tx
          .update(transactions)
          .set({
            approval: "VERIFIED",
            remainingBalance: nextRemaining,
            settlement: nextSettlement,
          })
          .where(eq(transactions.id, transactionId))
          .returning();

        return { ok: true, transaction: updatedTxn };
      }

      const [updatedTxn] = await tx
        .update(transactions)
        .set({
          approval: "DISPUTED",
          settlement: "SETTLED",
          remainingBalance: 0,
        })
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
    logger.error("Failed to resolve transaction", { error });
    Sentry.captureException(error);
    return {
      ok: false,
      error: "Failed to resolve transaction.",
    };
  }
}

export async function processPayment(
  customerId: string,
  amount: number,
): Promise<PaymentActionResult> {
  if (amount <= 0) {
    return { ok: false, error: "Payment amount must be positive" };
  }

  try {
    return await db.transaction(async (tx) => {
      const customer = await tx.query.customers.findFirst({
        where: eq(customers.id, customerId),
      });

      if (!customer) {
        return { ok: false, error: "Customer not found" };
      }

      const outstandingTxns = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.customerId, customerId),
            eq(transactions.type, "CREDIT"),
            eq(transactions.approval, "VERIFIED"),
          ),
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
            .set({ remainingBalance: 0, settlement: "SETTLED" })
            .where(eq(transactions.id, txn.id));
        } else {
          const newRemaining = txn.remainingBalance - remainingPayment;
          remainingPayment = 0;

          await tx
            .update(transactions)
            .set({ remainingBalance: newRemaining, settlement: "PARTIAL" })
            .where(eq(transactions.id, txn.id));
        }
      }

      const paymentTxnId = crypto.randomUUID();

      const [paymentTxn] = await tx
        .insert(transactions)
        .values({
          id: paymentTxnId,
          customerId,
          description: "Payment received",
          originalAmount: amount,
          remainingBalance: 0,
          type: "PAYMENT",
          approval: "VERIFIED",
          settlement: "SETTLED",
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
    logger.error("Failed to process payment", { error });
    Sentry.captureException(error);
    return {
      ok: false,
      error: "Failed to process payment.",
    };
  }
}

export async function deleteCustomer(
  customerId: string,
  acknowledgeNonZeroBalance = false,
): Promise<DeleteCustomerActionResult> {
  try {
    return await db.transaction(async (tx) => {
      const customer = await tx.query.customers.findFirst({
        where: eq(customers.id, customerId),
      });

      if (!customer) {
        return { ok: false, error: "Customer not found" };
      }

      const customerTransactions = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.customerId, customerId))
        .orderBy(asc(transactions.date));

      const normalizedBalance =
        reconcileLedger(customer, customerTransactions).customer.totalBalance ?? 0;

      if (normalizedBalance !== 0 && !acknowledgeNonZeroBalance) {
        const pendingAction = normalizedBalance > 0 ? "received debt" : "paid advance";
        return {
          ok: false,
          error: `Customer has a non-zero balance. Confirm you have already ${pendingAction} before deleting.`,
        };
      }

      await tx.delete(transactions).where(eq(transactions.customerId, customerId));
      await tx.delete(customers).where(eq(customers.id, customerId));

      return { ok: true };
    });
  } catch (error) {
    logger.error("Failed to delete customer", { error });
    Sentry.captureException(error);
    return {
      ok: false,
      error: "Failed to delete customer.",
    };
  }
}

export async function getCustomers() {
  return await db.query.customers.findMany();
}
