import styles from './TransactionList.module.css';

interface Transaction {
  id: string;
  description: string;
  date: string;
  type: 'CREDIT' | 'PAYMENT';
  originalAmount: number;
  remainingBalance: number;
  settlement: 'UNPAID' | 'PARTIAL' | 'SETTLED' | 'ADVANCE';
  approval: 'PENDING' | 'VERIFIED' | 'DISPUTED';
}

interface Props {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: Props) {
  if (!transactions || transactions.length === 0) {
    return <p className="text-center text-muted p-md">No transactions yet.</p>;
  }

  return (
    <ul className={styles.list} role="list">
      {transactions.map(({ id, description, date, type, originalAmount, remainingBalance, settlement }) => {
        const isSettled = settlement === 'SETTLED';
        const isPartial = settlement === 'PARTIAL';
        const isUnpaid = settlement === 'UNPAID' && type === 'CREDIT';

        const cardClass = [
          styles.card,
          isSettled ? styles.settled : '',
          isUnpaid ? styles.unpaid : '',
        ].filter(Boolean).join(' ');

        return (
          <li key={id} className={cardClass} aria-label={`${description}, ${type === 'CREDIT' ? '+' : '-'}Rs. ${originalAmount}, ${settlement}`}>
            <div className="flex-row justify-between items-center">
              <div>
                <div className={styles.desc}>{description}</div>
                <time className={styles.date} dateTime={new Date(date).toISOString()}>
                  {new Date(date).toLocaleDateString()}
                </time>
              </div>
              <div className="flex-col items-end">
                <div className={`${styles.amount} ${type === 'CREDIT' ? styles.debt : styles.advance}`}>
                  {type === 'CREDIT' ? '+' : '-'}Rs. {originalAmount}
                </div>
                {isSettled && <span className={styles.settledBadge}>Settled</span>}
                {isUnpaid && <span className={styles.unpaidBadge}>Unpaid</span>}
                {isPartial && (
                  <div className={styles.partialContainer}>
                    <span className={styles.partialText}>Rs. {remainingBalance} left</span>
                    <div className={styles.progressTrack} role="progressbar" aria-valuenow={originalAmount - remainingBalance} aria-valuemin={0} aria-valuemax={originalAmount}>
                      <div className={styles.progressFill} style={{ width: `${((originalAmount - remainingBalance) / originalAmount) * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
