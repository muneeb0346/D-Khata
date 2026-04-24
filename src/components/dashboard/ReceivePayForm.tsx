import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './ReceivePayForm.module.css';

interface Props {
  onSubmit: (amount: number) => Promise<void>;
  onCancel: () => void;
}

export function ReceivePayForm({ onSubmit, onCancel }: Props) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [amountError, setAmountError] = useState('');

  const validate = (): boolean => {
    const parsed = Number(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setAmountError('Amount must be greater than 0.');
      return false;
    }
    setAmountError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(Number(amount));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel} role="dialog" aria-modal="true" aria-label="Record payment received">
      <section className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Receive Payment</h3>

        <form onSubmit={handleSubmit} className="flex-col gap-md" noValidate>
          <div className="flex-col gap-sm">
            <label htmlFor="pay-amount" className={styles.label}>Amount (Rs) *</label>
            <input
              id="pay-amount"
              required
              type="number"
              inputMode="numeric"
              min={1}
              className={styles.input}
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {amountError && <span className={styles.error} role="alert" aria-live="polite">{amountError}</span>}
          </div>

          <div className="flex-row gap-md">
            <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={loading} aria-busy={loading}>
              {loading ? 'Processing...' : 'Receive Pay'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
