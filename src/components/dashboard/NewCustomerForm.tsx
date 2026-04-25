import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './NewCustomerForm.module.css';
import { createCustomer, updateCustomer } from '@/server/actions';
import { sanitizeName, sanitizePhone, formatCnic, PHONE_LENGTH, CNIC_MAX_LENGTH } from '@/utils/formatters';
import { Customer } from '@/types';

interface Props {
  initialData?: Customer;
  onCancel: () => void;
  onSuccess: () => void;
}

export function CustomerForm({ initialData, onCancel, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [cnic, setCnic] = useState(initialData?.cnic || '');

  const isEdit = !!initialData;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    const address = (formData.get('address') as string).trim();

    setLoading(true);
    try {
      if (isEdit) {
        const result = await updateCustomer(initialData.id, {
          name: name.trim(),
          phone,
          address: address || undefined,
          cnic: cnic || undefined,
        });

        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createCustomer({
          name: name.trim(),
          phone,
          address: address || undefined,
          cnic: cnic || undefined,
        });

        if (!result.ok) {
          setError(result.error);
          return;
        }
      }

      onSuccess();
    } catch {
      setError(`Failed to ${isEdit ? 'update' : 'create'} customer.`);
    }

    setLoading(false);
  };

  return (
    <div className={styles.overlay} onClick={onCancel} role="dialog" aria-modal="true" aria-label={`${isEdit ? 'Edit' : 'New'} customer form`}>
      <section className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{isEdit ? 'Edit Customer' : 'New Customer'}</h2>

        {error && <div className={styles.errorBanner} role="alert" aria-live="assertive">{error}</div>}

        <form id="new-customer-form" onSubmit={handleSubmit} className="flex-col gap-md" noValidate>
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
            <input id="field-address" name="address" className={styles.input} placeholder="House 1, Street 2" autoComplete="street-address" defaultValue={initialData?.address || ''} />
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
        </form>

        <div className="flex-row gap-md">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button type="submit" form="new-customer-form" disabled={loading} aria-busy={loading}>{loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Customer')}</Button>
        </div>
      </section>
    </div>
  );
}
