import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './NewCustomerForm.module.css';
import { createCustomer } from '@/server/actions';

interface Props {
  onCancel: () => void;
  onSuccess: () => void;
}

const PHONE_LENGTH = 11;
const CNIC_DIGIT_COUNT = 13;
const CNIC_DASH_POSITIONS = [5, 12];
const CNIC_MAX_LENGTH = 15;

function sanitizeName(raw: string): string {
  return raw.replace(/[^a-zA-Z\s.'-]/g, '');
}

const PHONE_PREFIX = '03';
const PHONE_REMAINING = PHONE_LENGTH - PHONE_PREFIX.length;

function sanitizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.startsWith(PHONE_PREFIX)) {
    return digits.slice(0, PHONE_LENGTH);
  }
  if (digits.startsWith('0')) {
    return PHONE_PREFIX + digits.slice(1, PHONE_REMAINING + 1);
  }
  return PHONE_PREFIX + digits.slice(0, PHONE_REMAINING);
}

function formatCnic(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, CNIC_DIGIT_COUNT);
  let formatted = '';
  for (let i = 0; i < digits.length; i++) {
    if (CNIC_DASH_POSITIONS.includes(i)) {
      formatted += '-';
    }
    formatted += digits[i];
  }
  return formatted;
}

export function NewCustomerForm({ onCancel, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    const address = (formData.get('address') as string).trim();

    setLoading(true);
    try {
      await createCustomer({
        name: name.trim(),
        phone,
        address: address || undefined,
        cnic: cnic || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.container} aria-label="New customer form">
      <h2 className={styles.title}>New Customer</h2>

      {error && <div className={styles.errorBanner} role="alert" aria-live="assertive">{error}</div>}

      <form onSubmit={handleSubmit} className="flex-col gap-md" noValidate>
        <div className="flex-col gap-sm">
          <label htmlFor="field-name" className={styles.label}>Name *</label>
          <input
            id="field-name"
            required
            name="name"
            className={styles.input}
            placeholder="Ali Khan"
            value={name}
            onChange={(e) => setName(sanitizeName(e.target.value))}
            autoComplete="name"
          />
        </div>
        <div className="flex-col gap-sm">
          <label htmlFor="field-phone" className={styles.label}>Phone (WhatsApp) *</label>
          <input
            id="field-phone"
            required
            name="phone"
            type="tel"
            className={styles.input}
            placeholder="03001234567"
            value={phone}
            maxLength={PHONE_LENGTH}
            onChange={(e) => setPhone(sanitizePhone(e.target.value))}
            autoComplete="tel"
          />
        </div>
        <div className="flex-col gap-sm">
          <label htmlFor="field-address" className={styles.label}>Address (Optional)</label>
          <input id="field-address" name="address" className={styles.input} placeholder="House 1, Street 2" autoComplete="street-address" />
        </div>
        <div className="flex-col gap-sm">
          <label htmlFor="field-cnic" className={styles.label}>CNIC (Optional)</label>
          <input
            id="field-cnic"
            name="cnic"
            className={styles.input}
            placeholder="12345-1234567-1"
            value={cnic}
            maxLength={CNIC_MAX_LENGTH}
            onChange={(e) => setCnic(formatCnic(e.target.value))}
            inputMode="numeric"
          />
        </div>

        <div className={`flex-row gap-md ${styles.actions}`}>
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={loading} aria-busy={loading}>{loading ? 'Saving...' : 'Save Customer'}</Button>
        </div>
      </form>
    </section>
  );
}
