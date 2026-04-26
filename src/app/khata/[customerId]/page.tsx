'use client';

import { useCallback, useEffect, useState } from 'react';
import { getLedger, resolveTransaction } from '@/server/actions';
import { BalanceGraph } from '@/components/charts/BalanceGraph';
import { TransactionList } from '@/components/khata/TransactionList';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import styles from './page.module.css';
import balanceStyles from '@/components/khata/BalanceSummary.module.css';
import { useParams } from 'next/navigation';
import { LedgerData } from '@/types';

export default function PublicKhata() {
  const params = useParams();
  const customerId = params.customerId as string;

  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getLedger(customerId);
      if (!result.ok) {
        setLedgerData(null);
        setError(result.error);
        alert(result.error);
        return;
      }

      setLedgerData(result.ledgerData);
    } catch {
      setLedgerData(null);
      setError('Failed to load ledger');
      alert('Failed to load ledger');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fetchLedger();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [fetchLedger]);

  const handleResolve = async (resolution: 'VERIFIED' | 'DISPUTED') => {
    if (!ledgerData?.pendingTransaction) return;
    try {
      const result = await resolveTransaction(customerId, ledgerData.pendingTransaction.id, resolution);
      if (!result.ok) {
        alert(result.error);
        return;
      }

      fetchLedger();
    } catch {
      alert('Failed to resolve transaction');
    }
  };

  if (loading) {
    return (
      <main className="layout-container flex-col">
        <Spinner />
      </main>
    );
  }

  if (error && !ledgerData) {
    return (
      <main className="layout-container flex-col p-md" aria-live="assertive">
        <div className="card-base flex-col gap-sm">
          <strong className="text-debt">{error}</strong>
          <Button variant="primary" onClick={fetchLedger}>Try Again</Button>
        </div>
      </main>
    );
  }

  if (!ledgerData) {
    return null;
  }

  const { customer, transactions, pendingTransaction } = ledgerData;

  return (
    <main className="layout-container flex-col" aria-live="polite">
      <header className={styles.header} role="banner">
        <h1 className={styles.name}>{customer.name}&apos;s Ledger</h1>
      </header>

      <section className="txns-container p-md" aria-label="Ledger overview">
        <div className={balanceStyles.balanceHeader}>
          <span className="text-muted">Current Balance</span>
          <h2 className={`${balanceStyles.balanceAmount} ${Number(customer.totalBalance ?? 0) < 0 ? 'text-advance' : (Number(customer.totalBalance ?? 0) > 0 ? 'text-debt' : '')}`}>
            Rs. {Math.abs(Number(customer.totalBalance ?? 0))} {Number(customer.totalBalance ?? 0) < 0 ? '(Adv)' : (Number(customer.totalBalance ?? 0) > 0 ? '(Debt)' : '')}
          </h2>
        </div>

        <section aria-label="Balance history chart">
          <h3 className="sr-only">Balance History</h3>
          <BalanceGraph transactions={transactions} isDebt={Number(customer.totalBalance ?? 0) > 0} />
        </section>

        <section aria-label="Transaction history">
          <h3 className="section-title pb-0">Transaction History</h3>
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
              for <strong>Rs. {pendingTransaction.originalAmount}</strong>.
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
