import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AddCreditForm } from '@/components/dashboard/AddCreditForm';
import { ReceivePayForm } from '@/components/dashboard/ReceivePayForm';
import { Spinner } from '@/components/ui/Spinner';
import styles from './ActiveLedgerView.module.css';
import { getLedger, addPendingCredit, processPayment } from '@/server/actions';

interface Props {
  customerId: string;
  onBack: () => void;
}

export function ActiveLedgerView({ customerId, onBack }: Props) {
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<'credit' | 'pay' | null>(null);

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

  const handleCreditSubmit = async (data: { amount: number; description: string }) => {
    try {
      await addPendingCredit(customerId, data);
      setActiveForm(null);
      fetchLedger();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handlePaySubmit = async (amount: number) => {
    try {
      await processPayment(customerId, amount);
      setActiveForm(null);
      fetchLedger();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleFileCase = () => {
    const caseInfo = `CUSTOMER CASE INFORMATION\n-------------------------\nName: ${ledgerData?.customer?.name}\nPhone: ${ledgerData?.customer?.phone}\nCNIC: ${ledgerData?.customer?.cnic || 'Not Provided'}\nAddress: ${ledgerData?.customer?.address || 'Not Provided'}\n\nTotal Balance: Rs. ${Math.abs(ledgerData?.customer?.totalBalance)} ${ledgerData?.customer?.totalBalance < 0 ? '(Advance)' : '(Debt)'}\n\nPlease proceed with necessary actions.`;
    navigator.clipboard.writeText(caseInfo);
    alert('Customer information copied to clipboard for filing a case.');
  };

  if (loading || !ledgerData) return <Spinner />;

  const { customer, transactions, pendingTransaction } = ledgerData;
  const isLocked = !!pendingTransaction;

  return (
    <article className="flex-col h-full" aria-live="polite">
      <header className={styles.header}>
        <div className="flex-row justify-between gap-md">
          <Button variant="secondary" onClick={onBack} className="w-auto" aria-label="Go back to customer list">← Back</Button>
          <Button variant="secondary" onClick={handleShare} className="w-auto" aria-label="Share ledger link via clipboard">Share</Button>
        </div>
        <div className="flex-col">
          <h2 className={styles.name}>{customer.name}</h2>
          <span className={`${styles.balance} ${customer.totalBalance < 0 ? styles.advance : styles.debt}`}>
            Balance: Rs. {Math.abs(customer.totalBalance)} {customer.totalBalance < 0 ? '(Adv)' : '(Debt)'}
          </span>
        </div>
      </header>

      <section className={styles.txnsContainer} aria-label="Transactions">
        {isLocked && (
          <div className={styles.lockedBanner} role="alert">
            Account Locked: Awaiting customer verification for a pending transaction.
          </div>
        )}

        <h3 className="sr-only">Transaction List</h3>
        {transactions.length === 0 ? (
          <p className="p-md text-center text-muted">No transactions yet.</p>
        ) : (
          <ul className="flex-col gap-sm p-md w-full" role="list">
            {[...transactions].reverse().map((t: any) => (
              <li key={t.id} className={`${styles.txnCard} ${t.approval === 'PENDING' ? styles.pendingCard : ''}`}>
                <div className="flex-row justify-between">
                  <strong>{t.description}</strong>
                  <span className={t.type === 'CREDIT' ? styles.debt : styles.advance}>
                    {t.type === 'CREDIT' ? '+' : '-'}Rs. {t.originalAmount}
                  </span>
                </div>
                <div className="flex-row justify-between mt-md text-xs text-muted">
                  <span>{new Date(t.date).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span>{t.approval} • {t.settlement}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <section className="p-md pb-0" aria-label="Customer details">
          <h3 className={styles.sectionTitle}>Customer Details</h3>
          <dl className={`${styles.txnCard} flex-col gap-sm`}>
            <div><dt className="text-muted">Name:</dt> <dd>{customer.name}</dd></div>
            <div><dt className="text-muted">Phone:</dt> <dd>{customer.phone}</dd></div>
            <div><dt className="text-muted">CNIC:</dt> <dd>{customer.cnic || 'N/A'}</dd></div>
            <div><dt className="text-muted">Address:</dt> <dd>{customer.address || 'N/A'}</dd></div>
            <div className="mt-md">
              <Button variant="secondary" onClick={handleFileCase} aria-label="Copy customer details to clipboard for filing a case">Copy Details to File Case</Button>
            </div>
          </dl>
        </section>
      </section>

      <footer className="flex-row gap-md sticky-bottom">
        <Button
          variant="danger"
          onClick={() => setActiveForm('credit')}
          disabled={isLocked}
          aria-label={isLocked ? 'Cannot add credit while account is locked' : 'Add a new credit transaction'}
        >
          Add Credit
        </Button>
        <Button
          variant="primary"
          onClick={() => setActiveForm('pay')}
          aria-label="Record a payment received from customer"
        >
          Receive Pay
        </Button>
      </footer>

      {activeForm === 'credit' && (
        <AddCreditForm onSubmit={handleCreditSubmit} onCancel={() => setActiveForm(null)} />
      )}

      {activeForm === 'pay' && (
        <ReceivePayForm onSubmit={handlePaySubmit} onCancel={() => setActiveForm(null)} />
      )}
    </article>
  );
}
