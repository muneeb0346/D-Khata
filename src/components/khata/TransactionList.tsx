import React from 'react';
import styles from './TransactionList.module.css';

interface Props {
  transactions: any[];
}

export function TransactionList({ transactions }: Props) {
  if (!transactions || transactions.length === 0) {
    return <p className="text-center text-muted p-md">No transactions yet.</p>;
  }

  return (
    <ul className={styles.list}>
      {transactions.map(t => {
        const isSettled = t.settlement === 'SETTLED';
        const isPartial = t.settlement === 'PARTIAL';

        return (
          <li key={t.id} className={`${styles.card} ${isSettled ? styles.settled : ''}`}>
            <div className="flex-row justify-between items-center">
              <div>
                <div className={styles.desc}>{t.description}</div>
                <div className={styles.date}>{new Date(t.date).toLocaleDateString()}</div>
              </div>
              <div className="flex-col items-end">
                <div className={`${styles.amount} ${t.type === 'CREDIT' ? styles.debt : styles.advance}`}>
                  {t.type === 'CREDIT' ? '+' : '-'}Rs. {t.originalAmount}
                </div>
                {t.type === 'CREDIT' && !isSettled && (
                  <div className={styles.remaining}>
                    {isPartial ? `Rs. ${t.remainingBalance} left` : 'Unpaid'}
                  </div>
                )}
                {isSettled && <div className={styles.settledBadge}>Settled</div>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
