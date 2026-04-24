'use client';

import React, { useEffect, useState } from 'react';
import { getLedger, resolveTransaction } from '@/server/actions';
import { BalanceGraph } from '@/components/charts/BalanceGraph';
import { TransactionList } from '@/components/khata/TransactionList';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';
import { useParams } from 'next/navigation';

export default function PublicKhata() {
  const params = useParams();
  const customerId = params.customerId as string;

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
    if (customerId) fetchLedger();
  }, [customerId]);

  const handleResolve = async (resolution: 'VERIFIED' | 'DISPUTED') => {
    if (!ledgerData?.pendingTransaction) return;
    try {
      await resolveTransaction(customerId, ledgerData.pendingTransaction.id, resolution);
      fetchLedger();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading || !ledgerData) return <main className="p-md text-center" aria-busy="true">Loading...</main>;

  const { customer, transactions, pendingTransaction } = ledgerData;

  return (
    <main className="layout-container flex-col" aria-live="polite">
      <header className="layout-header p-md" role="banner">
        <h1 className="m-0">{customer.name}&apos;s Ledger</h1>
      </header>

      <section className={styles.content} aria-label="Ledger overview">
        <div className={styles.balanceHeader}>
          <span className="text-muted">Current Balance</span>
          <h2 className={`${styles.balance} ${customer.totalBalance < 0 ? styles.advance : styles.debt}`}>
            Rs. {Math.abs(customer.totalBalance)}
          </h2>
        </div>

        <section aria-label="Balance history chart">
          <h3 className="sr-only">Balance History</h3>
          <BalanceGraph transactions={transactions} />
        </section>

        <section aria-label="Transaction history">
          <h3 className={`${styles.sectionTitle} pb-0`}>Transaction History</h3>
          <TransactionList transactions={transactions} />
        </section>
      </section>

      {pendingTransaction && (
        <aside className={styles.stickyBanner} role="alert" aria-live="assertive">
          <div className="flex-col gap-sm">
            <h3 className={`${styles.bannerTitle} m-0`}>Action Required</h3>
            <p className={styles.bannerText}>
              The merchant added a new transaction:
              <strong> {pendingTransaction.description} </strong>
              for Rs. {pendingTransaction.originalAmount}.
              Do you verify this?
            </p>
            <div className="flex-row gap-md mt-md">
              <Button variant="danger" onClick={() => handleResolve('DISPUTED')} aria-label="Reject pending transaction">Reject</Button>
              <Button variant="primary" onClick={() => handleResolve('VERIFIED')} aria-label="Verify and accept pending transaction">Verify &amp; Accept</Button>
            </div>
          </div>
        </aside>
      )}
    </main>
  );
}
