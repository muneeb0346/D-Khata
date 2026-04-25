import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './AddCreditForm.module.css';

interface Props {
  onSubmit: (data: { amount: number; description: string }) => Promise<string | undefined>;
  onCancel: () => void;
}

export function AddCreditForm({ onSubmit, onCancel }: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [descError, setDescError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const validate = (): boolean => {
    let valid = true;

    if (!description.trim()) {
      setDescError('Description is required.');
      valid = false;
    } else {
      setDescError('');
    }

    const parsed = Number(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setAmountError('Amount must be greater than 0.');
      valid = false;
    } else {
      setAmountError('');
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitError('');
    setLoading(true);
    try {
      const errorMessage = await onSubmit({ amount: Number(amount), description: description.trim() });
      if (errorMessage) {
        setSubmitError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel} role="dialog" aria-modal="true" aria-label="Add credit transaction">
      <section className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Add Credit</h3>

        {submitError && <div className="form-error-banner" role="alert" aria-live="assertive">{submitError}</div>}

        <form onSubmit={handleSubmit} className="flex-col gap-md" noValidate>
          <div className="flex-col gap-sm">
            <label htmlFor="credit-desc" className={styles.label}>Description *</label>
            <input
              id="credit-desc"
              required
              className={styles.input}
              placeholder="e.g. Goods delivered"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoComplete="off"
            />
            {descError && <span className={styles.error} role="alert" aria-live="polite">{descError}</span>}
          </div>

          <div className="flex-col gap-sm">
            <label htmlFor="credit-amount" className={styles.label}>Amount (Rs) *</label>
            <input
              id="credit-amount"
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
            <Button type="submit" variant="danger" disabled={loading} aria-busy={loading}>
              {loading ? 'Adding...' : 'Add Credit'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
