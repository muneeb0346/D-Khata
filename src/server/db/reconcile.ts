import type { Customer, Transaction } from '@/types';

function getTxDateValue(txn: Transaction) {
  return new Date(txn.date).getTime();
}

function getDerivedSettlement(originalAmount: number, remainingBalance: number): 'UNPAID' | 'PARTIAL' | 'SETTLED' {
  if (remainingBalance <= 0) return 'SETTLED';
  if (remainingBalance < originalAmount) return 'PARTIAL';
  return 'UNPAID';
}

export function reconcileLedger(customer: Customer, txns: Transaction[]): { customer: Customer; transactions: Transaction[] } {
  const ordered = [...txns].sort((a, b) => getTxDateValue(a) - getTxDateValue(b));
  const remainingByCreditId = new Map<string, number>();
  const creditQueue: string[] = [];
  let carriedAdvance = 0;

  let creditsTotal = 0;
  let paymentsTotal = 0;

  for (const txn of ordered) {
    if (txn.type === 'CREDIT' && txn.approval !== 'DISPUTED') {
      creditsTotal += txn.originalAmount;

      const consumedByAdvance = Math.min(carriedAdvance, txn.originalAmount);
      const nextRemaining = txn.originalAmount - consumedByAdvance;

      carriedAdvance -= consumedByAdvance;
      remainingByCreditId.set(txn.id, nextRemaining);

      if (nextRemaining > 0) {
        creditQueue.push(txn.id);
      }

      continue;
    }

    if (txn.type === 'PAYMENT' && txn.approval === 'VERIFIED') {
      paymentsTotal += txn.originalAmount;
      let paymentLeft = txn.originalAmount;

      while (paymentLeft > 0 && creditQueue.length > 0) {
        const creditId = creditQueue[0];
        const creditRemaining = remainingByCreditId.get(creditId) ?? 0;

        if (paymentLeft >= creditRemaining) {
          paymentLeft -= creditRemaining;
          remainingByCreditId.set(creditId, 0);
          creditQueue.shift();
          continue;
        }

        remainingByCreditId.set(creditId, creditRemaining - paymentLeft);
        paymentLeft = 0;
      }

      if (paymentLeft > 0) {
        carriedAdvance += paymentLeft;
      }
    }
  }

  const reconciledTransactions = ordered.map((txn) => {
    if (txn.type !== 'CREDIT' || txn.approval === 'DISPUTED') {
      return txn;
    }

    const remainingBalance = remainingByCreditId.get(txn.id) ?? 0;
    return {
      ...txn,
      remainingBalance,
      settlement: getDerivedSettlement(txn.originalAmount, remainingBalance),
    };
  });

  const normalizedBalance = creditsTotal - paymentsTotal;

  return {
    customer: { ...customer, totalBalance: normalizedBalance },
    transactions: reconciledTransactions,
  };
}
