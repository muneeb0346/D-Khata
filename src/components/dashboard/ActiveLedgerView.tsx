import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './ActiveLedgerView.module.css';
import { getLedger, addPendingCredit, processPayment } from '@/server/actions';

interface Props {
  customerId: string;
  onBack: () => void;
}

export function ActiveLedgerView({ customerId, onBack }: Props) {
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const data = await getLedger(customerId);
      setLedgerData(data);
    } catch (e) {
      alert("Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [customerId]);

  const handleShare = () => {
    const url = `${window.location.origin}/khata/${customerId}`;
    navigator.clipboard.writeText(`Please verify your D-Khata ledger: ${url}`);
    alert('Link copied to clipboard!');
  };

  const handleAddCredit = async () => {
    const amount = prompt("Enter credit amount (Rs):");
    if (!amount || isNaN(Number(amount))) return;
    const desc = prompt("Enter description:");
    if (!desc) return;

    try {
      await addPendingCredit(customerId, { amount: Number(amount), description: desc });
      fetchLedger();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReceivePay = async () => {
    const amount = prompt("Enter payment amount (Rs):");
    if (!amount || isNaN(Number(amount))) return;

    try {
      await processPayment(customerId, Number(amount));
      fetchLedger();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading || !ledgerData) return <div className="p-md">Loading...</div>;

  const { customer, transactions, pendingTransaction } = ledgerData;
  const isLocked = !!pendingTransaction;

  return (
    <div className="flex-col h-full">
      <div className={styles.header}>
        <Button variant="secondary" onClick={onBack} className="w-auto">← Back</Button>
        <div className="flex-col items-center">
          <h2 className={styles.name}>{customer.name}</h2>
          <span className={`${styles.balance} ${customer.totalBalance < 0 ? styles.advance : styles.debt}`}>
            Balance: Rs. {Math.abs(customer.totalBalance)} {customer.totalBalance < 0 ? '(Adv)' : '(Debt)'}
          </span>
        </div>
        <Button variant="secondary" onClick={handleShare} className="w-auto">Share</Button>
      </div>

      <div className={styles.txnsContainer}>
        {isLocked && (
          <div className={styles.lockedBanner}>
            Account Locked: Awaiting customer verification for a pending transaction.
          </div>
        )}

        {transactions.length === 0 ? (
          <p className="p-md text-center text-muted">No transactions yet.</p>
        ) : (
          <ul className="flex-col gap-sm p-md">
            {transactions.map((t: any) => (
              <li key={t.id} className={`${styles.txnCard} ${t.approval === 'PENDING' ? styles.pendingCard : ''}`}>
                <div className="flex-row justify-between">
                  <strong>{t.description}</strong>
                  <span className={t.type === 'CREDIT' ? styles.debt : styles.advance}>
                    {t.type === 'CREDIT' ? '+' : '-'}Rs. {t.originalAmount}
                  </span>
                </div>
                <div className="flex-row justify-between mt-md text-xs text-muted">
                  <span>{new Date(t.date).toLocaleDateString()}</span>
                  <span>{t.approval} • {t.settlement}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={`flex-row gap-md sticky-bottom`}>
        <Button
          variant="danger"
          onClick={handleAddCredit}
          disabled={isLocked}
        >
          Add Credit
        </Button>
        <Button
          variant="primary"
          onClick={handleReceivePay}
        >
          Receive Pay
        </Button>
      </div>
    </div>
  );
}
