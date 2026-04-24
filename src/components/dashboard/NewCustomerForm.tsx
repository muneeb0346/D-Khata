import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './NewCustomerForm.module.css';
import { createCustomer } from '@/server/actions';

interface Props {
  onCancel: () => void;
  onSuccess: () => void;
}

export function NewCustomerForm({ onCancel, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createCustomer({
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        address: formData.get('address') as string,
        cnic: formData.get('cnic') as string,
      });
      onSuccess();
    } catch (err) {
      alert('Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>New Customer</h2>
      <form onSubmit={handleSubmit} className="flex-col gap-md">
        <div className="flex-col gap-sm">
          <label className={styles.label}>Name *</label>
          <input required name="name" className={styles.input} placeholder="Ali Khan" />
        </div>
        <div className="flex-col gap-sm">
          <label className={styles.label}>Phone (WhatsApp) *</label>
          <input required name="phone" type="tel" className={styles.input} placeholder="03001234567" />
        </div>
        <div className="flex-col gap-sm">
          <label className={styles.label}>Address (Optional)</label>
          <input name="address" className={styles.input} placeholder="House 1, Street 2" />
        </div>
        <div className="flex-col gap-sm">
          <label className={styles.label}>CNIC (Optional)</label>
          <input name="cnic" className={styles.input} placeholder="12345-1234567-1" />
        </div>

        <div className={`flex-row gap-md ${styles.actions}`}>
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Customer'}</Button>
        </div>
      </form>
    </div>
  );
}
