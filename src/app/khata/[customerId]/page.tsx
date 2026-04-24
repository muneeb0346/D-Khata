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

  if (loading || !ledgerData) return <div className="p-md text-center">Loading...</div>;

  const { customer, transactions, pendingTransaction } = ledgerData;

  return (
    <div className="layout-container flex-col">
      <div className="layout-header p-md">
        {customer.name}&apos;s Ledger
      </div>

      <div className={styles.content}>
        <div className={styles.balanceHeader}>
          <span className="text-muted">Current Balance</span>
          <h2 className={`${styles.balance} ${customer.totalBalance < 0 ? styles.advance : styles.debt}`}>
            Rs. {Math.abs(customer.totalBalance)}
          </h2>
        </div>

        <BalanceGraph transactions={transactions} />

        <h3 className={`${styles.sectionTitle} pb-0`}>Transaction History</h3>
        <TransactionList transactions={transactions} />
      </div>

      {pendingTransaction && (
        <div className={styles.stickyBanner}>
          <div className="flex-col gap-sm">
            <h4 className={`${styles.bannerTitle} m-0`}>Action Required</h4>
            <p className={styles.bannerText}>
              The merchant added a new transaction:
              <strong> {pendingTransaction.description} </strong>
              for Rs. {pendingTransaction.originalAmount}.
              Do you verify this?
            </p>
            <div className="flex-row gap-md mt-md">
              <Button variant="danger" onClick={() => handleResolve('DISPUTED')}>Reject</Button>
              <Button variant="primary" onClick={() => handleResolve('VERIFIED')}>Verify &amp; Accept</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
