import { useMemo } from 'react';
import { Transaction } from '@/types';

interface Props {
  transactions: Transaction[];
}
export function TransactionList({ transactions }: Props) {
  const reversedTransactions = useMemo(() => {
    return transactions ? [...transactions].reverse() : [];
  }, [transactions]);

  if (!transactions || transactions.length === 0) {
    return <p className="text-center text-muted p-md">No transactions yet.</p>;
  }

  return (
    <ul className="flex-col gap-sm w-full" role="list">
      {reversedTransactions.map(({ id, description, date, type, originalAmount, remainingBalance, settlement, approval }) => {
        const isSettled = settlement === 'SETTLED';
        const isPartial = settlement === 'PARTIAL';
        const isUnpaid = settlement === 'UNPAID' && type === 'CREDIT';
        const isDisputed = approval === 'DISPUTED';

        const cardClass = [
          'card-base',
          approval === 'PENDING' ? 'card-pending' : '',
          isDisputed ? 'card-disputed' : '',
          isSettled ? 'status-settled' : '',
          isUnpaid ? 'status-unpaid' : '',
        ].filter(Boolean).join(' ');

        return (
          <li key={id} className={cardClass} aria-label={`${description}, ${type === 'CREDIT' ? '+' : '-'}Rs. ${originalAmount}, ${settlement}`}>
            <div className="flex-row justify-between">
              <strong>{description}</strong>
              <span className={type === 'CREDIT' ? 'text-debt' : 'text-advance'}>
                {type === 'CREDIT' ? '+' : '-'}Rs. {originalAmount}
              </span>
            </div>

            <div className="flex-row justify-between mt-md text-xs text-muted">
              <time dateTime={new Date(date).toISOString()}>
                {new Date(date).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </time>
              <span>{approval} • {settlement}</span>
            </div>

            {(isSettled || isUnpaid || isPartial || isDisputed) && (
              <div className="flex-col items-end mt-sm">
                {isSettled && !isDisputed && <span className="badge-settled">Fully Paid</span>}
                {isUnpaid && <span className="badge-unpaid">Unpaid</span>}
                {isDisputed && <span className="badge-disputed">Disputed</span>}
                {isPartial && (
                  <div className="partial-container">
                    <label htmlFor={`progress-${id}`} className="partial-text">Rs. {remainingBalance} left</label>
                    <progress id={`progress-${id}`} className="progress-bar" value={originalAmount - remainingBalance} max={originalAmount}>
                      {((originalAmount - remainingBalance) / originalAmount) * 100}%
                    </progress>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
