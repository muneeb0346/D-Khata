'use client';

import { AddCreditForm } from '@/components/dashboard/AddCreditForm';
import { ReceivePayForm } from '@/components/dashboard/ReceivePayForm';
import { CustomerForm } from '@/components/dashboard/NewCustomerForm';
import { Customer } from '@/types';

interface Props {
  activeForm: 'credit' | 'pay' | 'edit' | null;
  customer?: Customer;
  onCreditSubmit: (data: { amount: number; description: string }) => Promise<string | undefined>;
  onPaySubmit: (amount: number) => Promise<string | undefined>;
  onEditSuccess: () => void;
  onCancel: () => void;
}

export function LedgerFormSheet({
  activeForm,
  customer,
  onCreditSubmit,
  onPaySubmit,
  onEditSuccess,
  onCancel,
}: Props) {
  if (activeForm === 'credit') {
    return <AddCreditForm onSubmit={onCreditSubmit} onCancel={onCancel} />;
  }

  if (activeForm === 'pay') {
    return <ReceivePayForm onSubmit={onPaySubmit} onCancel={onCancel} />;
  }

  if (activeForm === 'edit' && customer) {
    return (
      <CustomerForm
        initialData={customer}
        onCancel={onCancel}
        onSuccess={onEditSuccess}
      />
    );
  }

  return null;
}